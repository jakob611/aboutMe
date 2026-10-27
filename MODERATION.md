# Comments, private moderation and caching

## Admin controls

- **Comments** lists public, removed or all comments, 40 per page. **Remove
  comment** hides it publicly; **Removed comments → Restore comment** reverses it.
- **Messages** shows private sender details, 40 messages per page.
- **Block address** applies to future comments and contact messages from that
  address. **Blocked addresses** allows unblocking. Blocking does not remove
  existing comments; remove those separately. The registry holds at most 500
  entries and never evicts an existing block silently.

An address identifier is an HMAC fingerprint, not an account or proof of a
person's identity. Shared networks may include several people, and VPNs or
changing addresses can defeat an address block.

## Private request information

For new submissions, the Worker uses Cloudflare's connecting IP header and
trusted request context for approximate country, region and city, when available.
It does not request GPS permission, use a tracking script or contact a geolocation
provider. Public forms disclose the moderation collection in a short bilingual
notice. Location estimates can be wrong, especially with VPNs and mobile networks.

Raw IP addresses and coordinates are not saved. Only the keyed address identifier,
approximate location and capture timestamp are stored, encrypted with AES-GCM in
R2 under `private/moderation/`. Storage paths are authenticated as encryption
associated data. Private admin APIs require the existing signed session and
same-origin mutation checks, and send `Cache-Control: private, no-store`.
The public media route rejects these private paths before reading storage.

Older submissions have no metadata and show unavailable; their original location
cannot be reconstructed. A metadata write failure does not turn an already
accepted message into a failure that would encourage duplicate submission.
Private details can consequently be unavailable for some newer records too.

### Runtime secret

`MODERATION_SECRET` must contain at least 32 random characters and be independent
of `ADMIN_SESSION_SECRET`. Store it in ignored `.dev.vars` locally and the
existing Worker secret store in production. Local and production keys should
be different. Keep the production key stable across deployments: changing it
changes address identifiers and makes old encrypted records unreadable. Any
rotation needs a planned re-encryption and block migration with the old key.
Never put this value in a `NEXT_PUBLIC_` setting or a committed file.

No database schema migration or new Cloudflare resource is required. Existing
`UPLOADS` buckets store the encrypted moderation records and public comment cache.

## Submission verification

Both submission handlers validate bounded JSON and origin, then redeem a fresh
Turnstile token before **any Neon query**. The expected action is `contact` or
`comment`; the successful result must match the exact configured request hostname.
The private address block registry is checked before database access too.
An unavailable moderation store fails closed. Successful posts reset the browser
widget. Email addresses and moderation details never enter public comment results.

## Why the proposed cache was adapted

The supplied all-comments example would also cache private email fields and does
not restrict results to an approved project. `unstable_cache` needs a persistent
adapter in this deployment; the existing OpenNext incremental and tag caches are
disabled. Next 16 also requires a second argument for `revalidateTag`.

This implementation uses a small persistent R2 data cache instead of provisioning
Next incremental-cache/tag-cache/queue infrastructure for one comment reader:

- `src/lib/get-comments.ts` serves only the newest 200 approved public comments
  per project, shared by the server page and public comments API.
- Cache entries expire after five minutes. Empty results are cached too. Admin
  lists bypass this cache; whole HTML pages and API responses are not cached.
- Posting, removal and restoration invalidate the project's entry. Unique
  tombstones and conditional ETag writes prevent an older in-flight cache fill
  from resurrecting a stale snapshot after invalidation.
- Cache read outages fall back to Neon. Failed database reads are never cached.
  If cache refresh fails after a successful post, the comment remains accepted
  and the client warns against submitting it again. A persisted moderation change
  with failed refresh reports that partial result and offers a safe retry.

Repeated reads within a cache lifetime avoid the comment query; each hit instead
uses an R2 read. Misses add R2 read/write overhead. Project records still come from
Neon, so this alone does not eliminate database wake-ups or Worker requests.
It reduces query load, but cannot promise lower bills or lower latency for every
request. Neon bills compute time and capacity, not individual query counts; if
usage remains within included quotas, a money saving may be zero. R2 also meters
operations. Compare real traffic and billing before claiming monetary savings.

Primary references:

- [OpenNext Cloudflare caching](https://opennext.js.org/cloudflare/caching)
- [Next unstable_cache](https://nextjs.org/docs/app/api-reference/functions/unstable_cache)
- [Next revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [Neon usage-based billing](https://neon.com/blog/new-usage-based-pricing)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare request metadata](https://developers.cloudflare.com/workers/runtime-apis/request/)
