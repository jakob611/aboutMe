import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projects, comments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { publicCommentFields } from "@/lib/public-comments";
import { getCachedComments, invalidateProjectComments } from "@/lib/get-comments";
import { isSameOrigin } from "@/lib/admin-auth";
import { readContactJson } from "@/lib/contact-delivery";
import { parseCommentInput } from "@/lib/comment-input";
import { COMMENT_TURNSTILE_ACTION, verifyContactTurnstile } from "@/lib/contact-turnstile";
import { captureSubmission, isSubmissionBlocked, storeSubmission } from "@/lib/moderation-store";

type Params = { params: Promise<{ slug: string }> };

// GET /api/projects/[slug]/comments
export async function GET(_req: Request, ctx: Params) {
  try {
    const { slug } = await ctx.params;
    const [project] = await getDb()
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug));
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const rows = await getCachedComments(project.id);
    return NextResponse.json({ comments: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Public comments could not be loaded.");
    return NextResponse.json(
      { error: "Failed to load comments" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/comments — add a comment
export async function POST(req: Request, ctx: Params) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ error: "Request not allowed" }, { status: 403 });
    if (!req.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "JSON required" }, { status: 415 });
    const parsed = await readContactJson(req);
    if (!parsed.ok) return NextResponse.json({ error: "Invalid request" }, { status: parsed.status });
    const body = parseCommentInput(parsed.value);
    if (!body || body.website) return NextResponse.json({ error: "Please enter a valid name, email and comment." }, { status: 400 });
    if (!(await verifyContactTurnstile({ request: req, token: body.token, secret: process.env.TURNSTILE_SECRET, hostnames: process.env.TURNSTILE_HOSTNAMES, action: COMMENT_TURNSTILE_ACTION }))) {
      return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 403 });
    }
    let submission: Awaited<ReturnType<typeof captureSubmission>>;
    try {
      submission = await captureSubmission(req);
      if (await isSubmissionBlocked(submission)) return NextResponse.json({ error: "This submission cannot be accepted." }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Comments are temporarily unavailable. Please try again later." }, { status: 503 });
    }
    // Verification and the private block list are checked before any Neon query.
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Comments are unavailable" }, { status: 503 });
    const { slug } = await ctx.params;
    const [project] = await getDb()
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug));
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { author, email, content } = body;
    const [inserted] = await getDb()
      .insert(comments)
      .values({
        projectId: project.id,
        author,
        email: email || null,
        content,
      })
      .returning(publicCommentFields);
    try { await storeSubmission("comment", inserted.id, submission); }
    catch { console.error("Private comment moderation metadata could not be stored."); }
    let cacheRefreshed = true;
    try { await invalidateProjectComments(project.id); }
    catch { cacheRefreshed = false; console.error("Public comment cache refresh failed after an accepted comment."); }
    return NextResponse.json({ ok: true, comment: inserted, cacheRefreshed }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Comment submission failed.");
    return NextResponse.json(
      { error: "Failed to post comment" },
      { status: 500 }
    );
  }
}
