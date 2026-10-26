import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

// GET /api/projects?featured=1 — list all projects (optionally only featured)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const featured = url.searchParams.get("featured");
    const category = url.searchParams.get("category");

    const rows = await getDb()
      .select()
      .from(projects)
      .where(
        and(
          featured === "1" ? eq(projects.featured, true) : undefined,
          category ? eq(projects.category, category) : undefined,
        ),
      )
      .orderBy(desc(projects.createdAt));

    return NextResponse.json({ projects: rows });
  } catch (err) {
    console.error("GET /api/projects error", err);
    return NextResponse.json(
      { error: "Failed to load projects" },
      { status: 500 },
    );
  }
}
