import { NextResponse } from "next/server";
import { PRIVATE_HEADERS, isSameOrigin, requireAdmin } from "@/lib/admin-auth";
import { CONTENT_MAX_BYTES, validateContentOverrides } from "@/lib/site-content";
import { SITE_CONTENT_KEY, adminContentSnapshot, boundedJSON, contentBucket } from "@/lib/site-content-store";
const reply = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: PRIVATE_HEADERS });
export async function GET(req: Request) { const denied = await requireAdmin(req); if (denied) return denied; if (!isSameOrigin(req)) return reply({ error: "Forbidden" }, 403); try { return reply(await adminContentSnapshot()); } catch { return reply({ error: "Could not load published content. Nothing was changed. Try again." }, 503); } }
export async function PUT(req: Request) {
  const denied = await requireAdmin(req); if (denied) return denied;
  if (!req.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Send JSON content." }, 415);
  if (Number(req.headers.get("content-length")) > CONTENT_MAX_BYTES) return reply({ error: "Content is too large." }, 413);
  let payload: { revision?: unknown; overrides?: unknown }; let overrides;
  try { const raw = await boundedJSON(req.body); if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some(key => key !== "revision" && key !== "overrides")) throw new Error("Invalid content document."); payload = raw; if (payload.revision !== null && (typeof payload.revision !== "string" || !/^[a-f0-9]{32}(?:-\d+)?$/.test(payload.revision))) throw new Error("Reload the current content before saving."); overrides = validateContentOverrides(payload.overrides); }
  catch (error) { return reply({ error: error instanceof Error ? error.message : "Invalid content." }, error instanceof Error && error.message === "Content is too large." ? 413 : 400); }
  try {
    const condition = new Headers(payload.revision === null ? { "If-None-Match": "*" } : { "If-Match": `"${payload.revision}"` });
    const stored = await (await contentBucket()).put(SITE_CONTENT_KEY, JSON.stringify({ version: 1, overrides }), { onlyIf: condition, httpMetadata: { contentType: "application/json", cacheControl: "no-store" } });
    if (!stored) return reply({ error: "Someone saved newer content. Reload the published version before saving your changes." }, 409);
    return reply({ ok: true, revision: stored.etag, overrides });
  } catch { return reply({ error: "Could not save content. Your draft is still here. Try again." }, 503); }
}
