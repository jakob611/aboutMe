import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { projectInputSchema, projectFieldErrors, readProjectJson, toProjectRow } from "@/lib/project-input";
import { projectGalleryForUpdate } from "@/lib/project-media";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Params) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const { id } = await ctx.params;
    const projectId = Number(id);
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(projectId) || projectId > 2147483647) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await readProjectJson(req);
    if (!body.ok) return NextResponse.json({ error: body.status === 413 ? "Project data is too large." : "Could not read project data." }, { status: body.status });
    const parsed = projectInputSchema.safeParse(body.value);
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the highlighted project fields.", fieldErrors: projectFieldErrors(parsed.error.issues) }, { status: 400 });
    }
    let row;
    try {
      row = toProjectRow(parsed.data);
    } catch {
      return NextResponse.json({ error: "Check the project slug.", fieldErrors: { slug: ["Use letters, numbers and single hyphens."] } }, { status: 400 });
    }

    const [existing] = await getDb()
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    row.gallery = projectGalleryForUpdate(parsed.data.gallery, existing.gallery);
    // PATCH callers that predate the media editor may omit optional fields.
    // Retain those stored values rather than treating omissions as removals.
    if (parsed.data.coverImage === undefined) row.coverImage = existing.coverImage ?? "";
    if (parsed.data.repoUrl === undefined) row.repoUrl = existing.repoUrl ?? "";
    if (parsed.data.linkUrl === undefined) row.linkUrl = existing.linkUrl ?? "";
    if (parsed.data.linkLabel === undefined) row.linkLabel = existing.linkLabel ?? "";
    if (parsed.data.tags === undefined) row.tags = existing.tags ?? [];
    if (parsed.data.featured === undefined) row.featured = Boolean(existing.featured);

    const [updated] = await getDb()
      .update(projects)
      .set(row)
      .where(eq(projects.id, projectId))
      .returning();

    return NextResponse.json({ ok: true, project: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const cause = err instanceof Error ? (err.cause as { code?: string } | undefined) : undefined;
    if (cause?.code === "23505" || message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ error: "Slug already exists", fieldErrors: { slug: ["Another project already uses this slug."] } }, { status: 409 });
    }
    console.error("PATCH /api/admin/projects/[id] failed.");
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Params) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const { id } = await ctx.params;
    const projectId = Number(id);
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(projectId) || projectId > 2147483647) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const [existing] = await getDb()
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await getDb().delete(projects).where(eq(projects.id, projectId));
    return NextResponse.json({ ok: true });
  } catch {
    console.error("DELETE /api/admin/projects/[id] failed.");
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
