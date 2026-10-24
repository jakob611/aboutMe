import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { db } from "@/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// GET /api/files/download?id=123 — open download for everyone
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
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
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { error: "File missing from storage" },
        { status: 410 }
      );
    }

    const stats = await stat(fullPath);
    const stream = createReadStream(fullPath);
    const readable = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => {
          const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
          controller.enqueue(buf);
        });
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    const encodedName = encodeURIComponent(row.originalName);
    return new NextResponse(readable, {
      status: 200,
      headers: {
        "Content-Type": row.mimeType || "application/octet-stream",
        "Content-Length": String(stats.size),
        "Content-Disposition": `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("GET /api/files/download error", err);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
