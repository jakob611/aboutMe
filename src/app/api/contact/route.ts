import { NextResponse } from "next/server";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";

// POST /api/contact
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };
    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim();
    const subject = (body.subject ?? "").trim();
    const message = (body.message ?? "").trim();

    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !message) {
      return NextResponse.json(
        { error: "Please fill in all required fields" },
        { status: 400 }
      );
    }

    await db.insert(contactMessages).values({
      name,
      email,
      subject: subject || null,
      message,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/contact error", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
