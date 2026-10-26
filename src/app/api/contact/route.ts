import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { contactMessages } from "@/db/schema";
import { parseContactPayload, readContactJson } from "@/lib/contact-delivery";

// POST /api/contact
export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) {
      return NextResponse.json({ error: "Request not allowed" }, { status: 403 });
    }
    if (!req.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "JSON required" }, { status: 415 });
    }
    const result = await readContactJson(req);
    if (!result.ok) return NextResponse.json({ error: "Invalid request" }, { status: result.status });
    const body = parseContactPayload(result.value);
    if (!body) {
      return NextResponse.json(
        { error: "Please fill in all required fields" },
        { status: 400 }
      );
    }
    if (body.website) return NextResponse.json({ error: "Request not accepted" }, { status: 400 });
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Contact form is unavailable" }, { status: 503 });
    }
    const { name, email, subject, message } = body;

    await getDb().insert(contactMessages).values({
      name,
      email,
      subject: subject || null,
      message,
    });

    return NextResponse.json({ ok: true, delivery: "inbox" });
  } catch {
    console.error("Contact inbox submission failed.");
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
