import { getUploads } from "@/lib/storage";

// A CV has one stable, dedicated object. Never accept a key from a request.
export const CV_OBJECT_KEY = "profile/cv.pdf";
export const CV_MAX_SIZE = 10 * 1024 * 1024;
export const CV_FILENAME = "Jakob-Tominc-CV.pdf";
export const CV_DOWNLOAD_HEADERS = {
  "Content-Type": "application/pdf",
  "Content-Disposition": `attachment; filename="${CV_FILENAME}"`,
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};

export type CVMetadata = {
  published: boolean;
  fileSize: number | null;
  updatedAt: string | null;
};

export function pdfBytesMatch(bytes: Uint8Array) {
  return /^%PDF-[12]\.\d[\r\n]/.test(String.fromCharCode(...bytes.slice(0, 9)));
}

export function isPublishedCV(object: { size: number; httpMetadata?: { contentType?: string } } | null) {
  return object !== null && object.size > 0 && object.size <= CV_MAX_SIZE &&
    object.httpMetadata?.contentType === "application/pdf";
}

export async function getCVMetadata(): Promise<CVMetadata> {
  const object = await (await getUploads()).head(CV_OBJECT_KEY);
  if (!isPublishedCV(object)) return { published: false, fileSize: null, updatedAt: null };
  return {
    published: true,
    fileSize: object!.size,
    updatedAt: object!.uploaded.toISOString(),
  };
}
