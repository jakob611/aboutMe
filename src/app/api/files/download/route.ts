import { NextRequest, NextResponse } from "next/server";
import { getUploads } from "@/lib/storage";
import { getDb } from "@/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/files/download?id=123 — open download for everyone
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
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
    const object = await bucket.get(row.name);
    if (!object) {
      return NextResponse.json({ error: "File missing from storage" }, { status: 410 });
    }

    const encodedName = encodeURIComponent(row.originalName);
    return new NextResponse(object.body, {
      status: 200,
      headers: {
        "Content-Type": row.mimeType || "application/octet-stream",
        "Content-Length": String(object.size),
        "Content-Disposition": `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("GET /api/files/download error", err);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
