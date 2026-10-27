/** Server-side contact verification. Never import a secret into a client component. */
export const CONTACT_TURNSTILE_ACTION = "contact";
export const COMMENT_TURNSTILE_ACTION = "comment";
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

type VerificationInput = {
  request: Request;
  token: unknown;
  secret: string | undefined;
  hostnames: string | undefined;
  action?: typeof CONTACT_TURNSTILE_ACTION | typeof COMMENT_TURNSTILE_ACTION;
};

/** Bind a token to this exact frontend, not a wildcard or a forwarded Host header. */
export function contactTurnstileHostname(requestUrl: string, configured: string | undefined): string | null {
  let hostname: string;
  try { hostname = new URL(requestUrl).hostname.toLowerCase(); }
  catch { return null; }
  const allowed = (configured ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length || !allowed.every(value => value.length <= 253 && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(value))) return null;
  if (!LOCAL_HOSTNAMES.has(hostname) && allowed.some(value => LOCAL_HOSTNAMES.has(value))) return null;
  return allowed.includes(hostname) ? hostname : null;
}

/** Each attempt redeems its own token once; failures never run the existing handler. */
export async function verifyContactTurnstile(
  { request, token, secret, hostnames, action = CONTACT_TURNSTILE_ACTION }: VerificationInput,
  send: typeof fetch = fetch,
): Promise<boolean> {
  const expectedHostname = contactTurnstileHostname(request.url, hostnames);
  if (typeof token !== "string" || !token.trim() || token.length > 2048 || !secret?.trim() || !expectedHostname) return false;
  const body = new URLSearchParams({ secret, response: token });
  const ip = request.headers.get("cf-connecting-ip");
  // Cloudflare supplies this header in deployment. Do not trust X-Forwarded-For.
  if (ip && ip.length <= 45 && /^[0-9a-f:.]+$/i.test(ip)) body.set("remoteip", ip);
  try {
    const response = await send(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    if (!result || typeof result !== "object") return false;
    const verified = result as { success?: unknown; action?: unknown; hostname?: unknown };
    return verified.success === true && verified.action === action && verified.hostname === expectedHostname;
  } catch {
    return false;
  }
}
