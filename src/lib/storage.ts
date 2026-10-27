import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface UploadBucket {
  put(key: string, value: ArrayBuffer | string, options?: {
    httpMetadata?: { contentType?: string; cacheControl?: string };
    onlyIf?: Headers;
  }): Promise<{ etag: string } | null>;
  head(key: string): Promise<{
    size: number;
    uploaded: Date;
    httpMetadata?: { contentType?: string };
  } | null>;
  get(key: string): Promise<{
    body: ReadableStream<Uint8Array>;
    size: number;
    etag: string;
    httpMetadata?: { contentType?: string };
  } | null>;
  delete(key: string): Promise<void>;
}

export async function getUploads() {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as typeof env & { UPLOADS?: UploadBucket }).UPLOADS;
  if (!bucket) throw new Error("Bind the aboutme-uploads R2 bucket as UPLOADS.");
  return bucket;
}
