import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { services } from "@/db/schema";
import { asc } from "drizzle-orm";

// GET /api/services
export async function GET() {
  try {
    const rows = await getDb()
      .select()
      .from(services)
      .orderBy(asc(services.orderIndex));
    return NextResponse.json({ services: rows });
  } catch (err) {
    console.error("GET /api/services error", err);
    return NextResponse.json(
      { error: "Failed to load services" },
      { status: 500 }
    );
  }
}
