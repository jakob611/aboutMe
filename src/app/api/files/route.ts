import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readdir, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { db } from "@/db";
import { files } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// GET /api/files — public list of files for download
export async function GET() {
  try {
    const rows = await db
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
    await ensureUploadDir();

    const form = await req.formData();
    const password = (form.get("password") as string) ?? "";
    const file = form.get("file") as File | null;
    const description = (form.get("description") as string) ?? "";

    const expected = process.env.UPLOAD_PASSWORD ?? "";
    if (!expected) {
      return NextResponse.json(
        { error: "UPLOAD_PASSWORD not configured on server" },
        { status: 500 }
      );
    }
    if (password !== expected) {
      return NextResponse.json(
        { error: "Wrong password" },
        { status: 401 }
      );
    }
    if (!file) {
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
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const storedName = `${id}-${safeBase}`;
    const fullPath = path.join(UPLOAD_DIR, storedName);

    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buf);

    const [inserted] = await db
      .insert(files)
      .values({
        name: storedName,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        description: description || null,
      })
      .returning();

    return NextResponse.json({ ok: true, file: inserted });
  } catch (err) {
    console.error("POST /api/files error", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// DELETE /api/files?id=...&password=... — password-protected delete
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const password = url.searchParams.get("password") ?? "";
    const expected = process.env.UPLOAD_PASSWORD ?? "";
    if (!expected || password !== expected) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const [row] = await db
      .select()
      .from(files)
      .where(eq(files.id, Number(id)));
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const fullPath = path.join(UPLOAD_DIR, row.name);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
    await db.delete(files).where(eq(files.id, row.id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/files error", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
