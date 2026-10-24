import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projects, comments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type Params = { params: Promise<{ slug: string }> };

// GET /api/projects/[slug]
export async function GET(_req: Request, ctx: Params) {
  try {
    const { slug } = await ctx.params;
    const [row] = await getDb()
      .select()
      .from(projects)
      .where(eq(projects.slug, slug));
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const projectComments = await getDb()
      .select()
      .from(comments)
      .where(and(eq(comments.projectId, row.id), eq(comments.approved, true)))
      .orderBy(comments.createdAt);

    return NextResponse.json({ project: row, comments: projectComments });
  } catch (err) {
    console.error("GET /api/projects/[slug] error", err);
    return NextResponse.json(
      { error: "Failed to load project" },
      { status: 500 }
    );
  }
}
