import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { contactMessages } from "@/db/schema";
import { PRIVATE_HEADERS, requireAdmin } from "@/lib/admin-auth";
import { readBlocks, readSubmission } from "@/lib/moderation-store";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const page = Number(new URL(req.url).searchParams.get("page") || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    return NextResponse.json({ error: "Invalid message page" }, { status: 400, headers: PRIVATE_HEADERS });
  }
  try {
    const { blocks } = await readBlocks();
    const messages = await getDb()
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt), desc(contactMessages.id)).limit(41).offset((page - 1) * 40);
    const visible = messages.slice(0, 40);
    const enriched = [];
    for (let offset = 0; offset < visible.length; offset += 8) {
      enriched.push(...await Promise.all(visible.slice(offset, offset + 8).map(async row => {
        try { return { ...row, moderation: await readSubmission("message", row.id, blocks) }; }
        catch { return { ...row, moderation: null }; }
      })));
    }
    return NextResponse.json({ messages: enriched, page, hasMore: messages.length > 40 }, { headers: PRIVATE_HEADERS });
  } catch {
    console.error("Private inbox messages could not be loaded.");
    return NextResponse.json({ error: "Messages are temporarily unavailable. Please try again." }, { status: 503, headers: PRIVATE_HEADERS });
  }
}
