import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { IMAGE_TYPES, imageBytesMatch } from "@/lib/media";
import { getUploads } from "@/lib/storage";

const MAX_SIZE = 12 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  if (Number(req.headers.get("content-length")) > MAX_SIZE + 65536) {
    return NextResponse.json({ error: "Image too large (max 12 MB)" }, { status: 413 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choose a non-empty image file" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Image too large (max 12 MB)" }, { status: 413 });
    if (!Object.hasOwn(IMAGE_TYPES, file.type)) return NextResponse.json({ error: "Only JPEG, PNG, WebP, GIF, or AVIF images are allowed" }, { status: 415 });
    const value = await file.arrayBuffer();
    if (!imageBytesMatch(new Uint8Array(value), file.type)) {
      return NextResponse.json({ error: "The image contents do not match its file type" }, { status: 415 });
    }
    const key = `projects/${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;
    await (await getUploads()).put(key, value, { httpMetadata: { contentType: file.type } });
    return NextResponse.json({ ok: true, key, url: `/api/media/${key}` });
  } catch (err) {
    console.error("POST /api/admin/upload error", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
