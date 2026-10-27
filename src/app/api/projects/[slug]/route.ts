import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projects, comments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { serializePublicProject } from "@/lib/project-media";
import { publicCommentFields } from "@/lib/public-comments";

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
      .select(publicCommentFields)
      .from(comments)
      .where(and(eq(comments.projectId, row.id), eq(comments.approved, true)))
      .orderBy(comments.createdAt);

    return NextResponse.json({ project: serializePublicProject(row), comments: projectComments });
  } catch {
    console.error("GET /api/projects/[slug] failed.");
    return NextResponse.json(
      { error: "Failed to load project" },
      { status: 500 }
    );
  }
}
