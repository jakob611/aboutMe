import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projects, comments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

type Params = { params: Promise<{ slug: string }> };

// GET /api/projects/[slug]/comments
export async function GET(_req: Request, ctx: Params) {
  try {
    const { slug } = await ctx.params;
    const [project] = await getDb()
      .select()
      .from(projects)
      .where(eq(projects.slug, slug));
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const rows = await getDb()
      .select()
      .from(comments)
      .where(
        and(eq(comments.projectId, project.id), eq(comments.approved, true))
      )
      .orderBy(desc(comments.createdAt));
    return NextResponse.json({ comments: rows });
  } catch (err) {
    console.error("GET /api/projects/[slug]/comments error", err);
    return NextResponse.json(
      { error: "Failed to load comments" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/comments — add a comment
export async function POST(req: Request, ctx: Params) {
  try {
    const { slug } = await ctx.params;
    const [project] = await getDb()
      .select()
      .from(projects)
      .where(eq(projects.slug, slug));
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      author?: string;
      email?: string;
      content?: string;
    };
    const author = (body.author ?? "").trim();
    const email = (body.email ?? "").trim();
    const content = (body.content ?? "").trim();

    if (!author || author.length > 100) {
      return NextResponse.json(
        { error: "Please enter a valid name" },
        { status: 400 }
      );
    }
    if (!content || content.length > 2000) {
      return NextResponse.json(
        { error: "Comment must be between 1 and 2000 characters" },
        { status: 400 }
      );
    }

    const [inserted] = await getDb()
      .insert(comments)
      .values({
        projectId: project.id,
        author,
        email: email || null,
        content,
      })
      .returning();

    return NextResponse.json({ ok: true, comment: inserted });
  } catch (err) {
    console.error("POST /api/projects/[slug]/comments error", err);
    return NextResponse.json(
      { error: "Failed to post comment" },
      { status: 500 }
    );
  }
}
