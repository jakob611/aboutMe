import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { projectInputSchema, projectFieldErrors, readProjectJson, toProjectRow } from "@/lib/project-input";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const rows = await getDb()
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
    return NextResponse.json({ projects: rows });
  } catch {
    console.error("GET /api/admin/projects failed.");
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
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
    const [inserted] = await getDb().insert(projects).values(row).returning();
    return NextResponse.json({ ok: true, project: inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const cause = err instanceof Error ? (err.cause as { code?: string } | undefined) : undefined;
    if (cause?.code === "23505" || message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ error: "Slug already exists", fieldErrors: { slug: ["Another project already uses this slug."] } }, { status: 409 });
    }
    console.error("POST /api/admin/projects failed.");
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
