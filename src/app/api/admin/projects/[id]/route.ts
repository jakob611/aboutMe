import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { projectInputSchema, toProjectRow } from "@/lib/project-input";

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
    const parsed = projectInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid project data" }, { status: 400 });
    }
    let row;
    try {
      row = toProjectRow(parsed.data);
    } catch {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const [existing] = await getDb()
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

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
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    console.error("PATCH /api/admin/projects/[id] error", err);
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
  } catch (err) {
    console.error("DELETE /api/admin/projects/[id] error", err);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
