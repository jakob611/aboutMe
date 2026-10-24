import { NextResponse } from "next/server";
import { IMAGE_TYPES, isProjectImageKey } from "@/lib/media";
import { getUploads } from "@/lib/storage";

type Params = { params: Promise<{ key: string[] }> };

export async function GET(_req: Request, ctx: Params) {
  try {
    const { key: parts } = await ctx.params;
    const key = parts.join("/");
    if (!isProjectImageKey(key)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const object = await (await getUploads()).get(key);
    const type = object?.httpMetadata?.contentType || "";
    if (!object || !Object.hasOwn(IMAGE_TYPES, type)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(object.body, {
      headers: {
        "Content-Type": type, "Content-Length": String(object.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (err) {
    console.error("GET /api/media error", err);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}
