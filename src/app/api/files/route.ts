import { NextRequest, NextResponse } from "next/server";
import { getUploads } from "@/lib/storage";
import { getDb } from "@/db";
import { files } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { allowAdminLogin, passwordsMatch } from "@/lib/admin-auth";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

async function checkPasswordRateLimit(req: Request) {
  if (await allowAdminLogin(req)) return null;
  return NextResponse.json(
    { error: "Too many password attempts. Try again in a minute." },
    { status: 429, headers: { "Retry-After": "60", "Cache-Control": "private, no-store" } }
  );
}

// GET /api/files — public list of files for download
export async function GET() {
  try {
    const rows = await getDb()
      .select()
      .from(files)
      .orderBy(desc(files.createdAt));
    return NextResponse.json({ files: rows });
  } catch (err) {
    console.error("GET /api/files error", err);
    return NextResponse.json(
      { error: "Failed to load files" },
      { status: 500 }
    );
  }
}

// POST /api/files — password-protected upload
export async function POST(req: NextRequest) {
  try {
    const limited = await checkPasswordRateLimit(req);
    if (limited) return limited;
    const form = await req.formData();
    const passwordField = form.get("password");
    const password = typeof passwordField === "string" ? passwordField : "";
    const file = form.get("file");
    const descriptionField = form.get("description");
    const description = typeof descriptionField === "string" ? descriptionField : "";

    const expected = process.env.UPLOAD_PASSWORD ?? "";
    if (!expected) {
      return NextResponse.json(
        { error: "UPLOAD_PASSWORD not configured on server" },
        { status: 500 }
      );
    }
    if (!(await passwordsMatch(password, expected))) {
      return NextResponse.json(
        { error: "Wrong password" },
        { status: 401 }
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 50 MB)" },
        { status: 413 }
      );
    }

    // Generate a safe, unique filename.
    const safeBase = file.name
      .replace(/[^\w.\-]+/g, "_")
      .replace(/^\.+/, "_");
    const id = crypto.randomUUID();
    const storedName = `${id}-${safeBase}`;
    const bucket = await getUploads();
    await bucket.put(storedName, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });

    let inserted;
    try {
      [inserted] = await getDb()
      .insert(files)
      .values({
        name: storedName,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        description: description || null,
      })
      .returning();
    } catch (error) {
      await bucket.delete(storedName);
      throw error;
    }

    return NextResponse.json({ ok: true, file: inserted });
  } catch (err) {
    console.error("POST /api/files error", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// DELETE /api/files?id=... — password is sent in the Authorization header.
export async function DELETE(req: NextRequest) {
  try {
    const limited = await checkPasswordRateLimit(req);
    if (limited) return limited;
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const password = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
    const expected = process.env.UPLOAD_PASSWORD ?? "";
    if (!(await passwordsMatch(password, expected))) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const [row] = await getDb()
      .select()
      .from(files)
      .where(eq(files.id, Number(id)));
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const bucket = await getUploads();
    await bucket.delete(row.name);
    await getDb().delete(files).where(eq(files.id, row.id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/files error", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
