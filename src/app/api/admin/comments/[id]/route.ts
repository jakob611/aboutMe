import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { comments } from "@/db/schema";
import { PRIVATE_HEADERS, requireAdmin } from "@/lib/admin-auth";
import { boundedJSON } from "@/lib/site-content-store";
import { invalidateProjectComments } from "@/lib/get-comments";

type Params = { params: Promise<{ id: string }> };
async function changeVisibility(request: Request, context: Params, approved: boolean) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Invalid comment ID" }, { status: 400, headers: PRIVATE_HEADERS });
  try {
    const [row] = await getDb().update(comments).set({ approved }).where(eq(comments.id, id)).returning({ id: comments.id, projectId: comments.projectId });
    if (!row) return NextResponse.json({ error: "Comment not found" }, { status: 404, headers: PRIVATE_HEADERS });
    try { await invalidateProjectComments(row.projectId); }
    catch {
      console.error("Public comment cache refresh failed after moderation.");
      return NextResponse.json({ error: `Comment ${approved ? "restoration" : "removal"} saved, but public cache refresh failed. Retry this action to refresh.`, persisted: true }, { status: 503, headers: PRIVATE_HEADERS });
    }
    return NextResponse.json({ ok: true, approved }, { headers: PRIVATE_HEADERS });
  } catch {
    console.error("Comment moderation failed.");
    return NextResponse.json({ error: "Could not update the comment. Please try again." }, { status: 503, headers: PRIVATE_HEADERS });
  }
}
/** Removal is recoverable; removed comments leave all public readers immediately after refresh. */
export async function DELETE(request: Request, context: Params) {
  const denied = await requireAdmin(request);
  return denied || changeVisibility(request, context, false);
}
export async function PATCH(request: Request, context: Params) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "JSON required" }, { status: 415, headers: PRIVATE_HEADERS });
  try {
    const value = await boundedJSON(request.body, 1024);
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 1 || (value as { approved?: unknown }).approved !== true) throw new Error("Invalid update.");
  } catch { return NextResponse.json({ error: "Choose a valid restore action" }, { status: 400, headers: PRIVATE_HEADERS }); }
  return changeVisibility(request, context, true);
}
