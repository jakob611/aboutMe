import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { projectInputSchema, toProjectRow } from "@/lib/project-input";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const rows = await getDb()
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
    return NextResponse.json({ projects: rows });
  } catch (err) {
    console.error("GET /api/admin/projects error", err);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
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
    const [inserted] = await getDb().insert(projects).values(row).returning();
    return NextResponse.json({ ok: true, project: inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const cause = err instanceof Error ? (err.cause as { code?: string } | undefined) : undefined;
    if (cause?.code === "23505" || message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    console.error("POST /api/admin/projects error", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
