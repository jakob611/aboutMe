import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { contactMessages } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const messages = await getDb()
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt));
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("GET /api/admin/messages error", err);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}
