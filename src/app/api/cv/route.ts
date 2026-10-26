import { NextResponse } from "next/server";
import { CV_DOWNLOAD_HEADERS, CV_OBJECT_KEY, getCVMetadata, isPublishedCV } from "@/lib/cv";
import { getUploads } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const object = await (await getUploads()).get(CV_OBJECT_KEY);
    if (!object || !isPublishedCV(object)) {
      return NextResponse.json({ error: "CV not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    return new NextResponse(object.body, {
      headers: { ...CV_DOWNLOAD_HEADERS, "Content-Length": String(object.size) },
    });
  } catch {
    return NextResponse.json({ error: "CV is unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function HEAD() {
  try {
    const cv = await getCVMetadata();
    return new NextResponse(null, {
      status: cv.published ? 200 : 404,
      headers: cv.published
        ? { ...CV_DOWNLOAD_HEADERS, "Content-Length": String(cv.fileSize) }
        : { "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
