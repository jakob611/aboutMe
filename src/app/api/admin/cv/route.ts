import { NextResponse } from "next/server";
import { PRIVATE_HEADERS, requireAdmin } from "@/lib/admin-auth";
import { CV_MAX_SIZE, CV_OBJECT_KEY, getCVMetadata, pdfBytesMatch } from "@/lib/cv";
import { getUploads } from "@/lib/storage";

const MAX_MULTIPART_SIZE = CV_MAX_SIZE + 65536;

async function readCVForm(req: Request): Promise<{ form: FormData } | { status: 400 | 413 }> {
  if (Number(req.headers.get("content-length")) > MAX_MULTIPART_SIZE) return { status: 413 };
  const reader = req.body?.getReader();
  if (!reader) return { status: 400 };
  const chunks: ArrayBuffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_MULTIPART_SIZE) {
        await reader.cancel();
        return { status: 413 };
      }
      chunks.push(value.slice().buffer);
    }
    const form = await new Response(new Blob(chunks), {
      headers: { "Content-Type": req.headers.get("content-type") ?? "" },
    }).formData();
    return { form };
  } catch {
    return { status: 400 };
  } finally {
    reader.releaseLock();
  }
}

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    return NextResponse.json(await getCVMetadata(), { headers: PRIVATE_HEADERS });
  } catch {
    return NextResponse.json({ error: "Could not load CV status. Try again." }, { status: 503, headers: PRIVATE_HEADERS });
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const reject = (error: string, status: number) => NextResponse.json({ error }, { status, headers: PRIVATE_HEADERS });
  const result = await readCVForm(req);
  if ("status" in result) return reject(result.status === 413 ? "PDF too large (max 10 MB)." : "Choose a PDF file.", result.status);
  const file = result.form.get("file");
  if (!(file instanceof File) || file.size === 0) return reject("Choose a non-empty PDF file.", 400);
  if (file.size > CV_MAX_SIZE) return reject("PDF too large (max 10 MB).", 413);
  if (file.type !== "application/pdf") return reject("Only PDF files are allowed.", 415);
  const value = await file.arrayBuffer();
  if (!pdfBytesMatch(new Uint8Array(value))) return reject("The file contents do not match a PDF.", 415);
  try {
    await (await getUploads()).put(CV_OBJECT_KEY, value, { httpMetadata: { contentType: "application/pdf" } });
    return NextResponse.json({ ok: true, ...(await getCVMetadata()) }, { headers: PRIVATE_HEADERS });
  } catch {
    return reject("Could not publish the CV. Try again.", 503);
  }
}
