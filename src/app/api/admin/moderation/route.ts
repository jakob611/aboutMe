import { NextResponse } from "next/server";
import { PRIVATE_HEADERS, requireAdmin } from "@/lib/admin-auth";
import { boundedJSON } from "@/lib/site-content-store";
import { readBlocks, setSubmissionBlock, validFingerprint } from "@/lib/moderation-store";

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try { return NextResponse.json(await readBlocks(), { headers: PRIVATE_HEADERS }); }
  catch { return NextResponse.json({ error: "The block list is unavailable. Please try again." }, { status: 503, headers: PRIVATE_HEADERS }); }
}
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "JSON required" }, { status: 415, headers: PRIVATE_HEADERS });
  let update: { fingerprint: string; blocked: boolean; reason: string };
  try {
    const input = await boundedJSON(request.body, 2048);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid update.");
    const value = input as Record<string, unknown>;
    if (Object.keys(value).some(key => !["fingerprint", "blocked", "reason"].includes(key)) || !validFingerprint(value.fingerprint) || typeof value.blocked !== "boolean" || (value.reason !== undefined && (typeof value.reason !== "string" || value.reason.length > 200))) throw new Error("Invalid update.");
    update = { fingerprint: value.fingerprint, blocked: value.blocked, reason: typeof value.reason === "string" ? value.reason.trim() : "" };
  } catch { return NextResponse.json({ error: "Choose a valid network identifier and block action." }, { status: 400, headers: PRIVATE_HEADERS }); }
  try {
    const blocks = await setSubmissionBlock(update.fingerprint, update.blocked, update.reason);
    return NextResponse.json({ ok: true, blocks }, { headers: PRIVATE_HEADERS });
  } catch {
    console.error("Private moderation block update failed.");
    return NextResponse.json({ error: "The block list could not be updated. It may have changed; please reload and try again." }, { status: 503, headers: PRIVATE_HEADERS });
  }
}
