import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { contactMessages } from "@/db/schema";
import { parseContactPayload, readContactJson } from "@/lib/contact-delivery";
import { verifyContactTurnstile } from "@/lib/contact-turnstile";
import { captureSubmission, isSubmissionBlocked, storeSubmission } from "@/lib/moderation-store";
import { isSameOrigin } from "@/lib/admin-auth";

// POST /api/contact
export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) {
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
    if (!(await verifyContactTurnstile({
      request: req,
      token: body["cf-turnstile-response"],
      secret: process.env.TURNSTILE_SECRET,
      hostnames: process.env.TURNSTILE_HOSTNAMES,
    }))) {
      return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 403 });
    }
    let submission: Awaited<ReturnType<typeof captureSubmission>>;
    try {
      submission = await captureSubmission(req);
      if (await isSubmissionBlocked(submission)) return NextResponse.json({ error: "This submission cannot be accepted." }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "The inbox is temporarily unavailable. Please try again later." }, { status: 503 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Contact form is unavailable" }, { status: 503 });
    }
    const { name, email, subject, message } = body;

    const [inserted] = await getDb().insert(contactMessages).values({
      name,
      email,
      subject: subject || null,
      message,
    }).returning({ id: contactMessages.id });
    try { await storeSubmission("message", inserted.id, submission); }
    catch { console.error("Private inbox moderation metadata could not be stored."); }

    return NextResponse.json({ ok: true, delivery: "inbox" });
  } catch {
    console.error("Contact inbox submission failed.");
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
