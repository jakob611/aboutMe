import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

// GET /api/projects?featured=1 — list all projects (optionally only featured)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const featured = url.searchParams.get("featured");
    const category = url.searchParams.get("category");

    let q = db.select().from(projects);
    // Apply filters with drizzle query builder via chained where calls.
    let builder: any = q;
    if (featured === "1") {
      builder = builder.where(eq(projects.featured, true));
    }
    if (category) {
      builder =
        featured === "1"
          ? db
              .select()
              .from(projects)
              .where(eq(projects.category, category))
          : builder.where(eq(projects.category, category));
    }
    const rows = await builder.orderBy(desc(projects.createdAt));

    return NextResponse.json({ projects: rows });
  } catch (err) {
    console.error("GET /api/projects error", err);
    return NextResponse.json(
      { error: "Failed to load projects" },
      { status: 500 }
    );
  }
}
