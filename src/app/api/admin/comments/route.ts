import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { comments, projects } from "@/db/schema";
import { PRIVATE_HEADERS, requireAdmin } from "@/lib/admin-auth";
import { readBlocks, readSubmission } from "@/lib/moderation-store";

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const query = new URL(request.url).searchParams;
  const page = Number(query.get("page") || 1), status = query.get("status") || "all";
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !["all", "public", "removed"].includes(status)) return NextResponse.json({ error: "Invalid comment filter" }, { status: 400, headers: PRIVATE_HEADERS });
  try {
    const { blocks } = await readBlocks();
    const rows = await getDb().select({
      id: comments.id, projectId: comments.projectId, author: comments.author,
      email: comments.email, content: comments.content, approved: comments.approved,
      createdAt: comments.createdAt, projectTitle: projects.titleEn, projectSlug: projects.slug,
    }).from(comments).innerJoin(projects, eq(comments.projectId, projects.id))
      .where(status === "all" ? undefined : eq(comments.approved, status === "public"))
      .orderBy(desc(comments.createdAt), desc(comments.id)).limit(41).offset((page - 1) * 40);
    const visible = rows.slice(0, 40);
    const enriched = [];
    // Bound R2 concurrency; metadata is never part of a public projection or cache.
    for (let offset = 0; offset < visible.length; offset += 8) {
      enriched.push(...await Promise.all(visible.slice(offset, offset + 8).map(async row => {
        try { return { ...row, moderation: await readSubmission("comment", row.id, blocks) }; }
        catch { return { ...row, moderation: null }; }
      })));
    }
    return NextResponse.json({ comments: enriched, page, hasMore: rows.length > 40 }, { headers: PRIVATE_HEADERS });
  } catch {
    console.error("Private comments could not be loaded.");
    return NextResponse.json({ error: "Comments are temporarily unavailable. Please try again." }, { status: 503, headers: PRIVATE_HEADERS });
  }
}
