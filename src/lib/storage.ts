import { getCloudflareContext } from "@opennextjs/cloudflare";

interface UploadBucket {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata: { contentType: string } }): Promise<unknown>;
  head(key: string): Promise<{
    size: number;
    uploaded: Date;
    httpMetadata?: { contentType?: string };
  } | null>;
  get(key: string): Promise<{
    body: ReadableStream<Uint8Array>;
    size: number;
    httpMetadata?: { contentType?: string };
  } | null>;
  delete(key: string): Promise<void>;
}

export async function getUploads() {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as unknown as { UPLOADS?: UploadBucket }).UPLOADS;
  if (!bucket) throw new Error("Bind the aboutme-uploads R2 bucket as UPLOADS.");
  return bucket;
}
