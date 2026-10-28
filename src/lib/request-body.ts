type BodyResult<T> = { ok: true; value: T } | { ok: false; status: 400 | 413 };

/** Enforce the byte budget while streaming, even with absent or false Content-Length. */
async function readBoundedBody<T>(request: Request, limit: number, parse: (body: Response) => Promise<T>): Promise<BodyResult<T>> {
  if (Number(request.headers.get("content-length")) > limit) {
    // Discard an already-known oversized upload without waiting for its sender.
    void request.body?.cancel().catch(() => {});
    return { ok: false, status: 413 };
  }
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400 };
  let size = 0;
  let tooLarge = false;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunk = await reader.read();
        if (chunk.done) { controller.close(); return; }
        size += chunk.value.byteLength;
        if (size > limit) {
          tooLarge = true;
          controller.error(new Error("Request body exceeds its limit."));
          await reader.cancel();
          return;
        }
        controller.enqueue(chunk.value);
      } catch (error) { controller.error(error); }
    },
    async cancel() { await reader.cancel(); },
  });
  try {
    const body = new Response(stream, { headers: { "Content-Type": request.headers.get("content-type") || "" } });
    return { ok: true, value: await parse(body) };
  } catch {
    return { ok: false, status: tooLarge ? 413 : 400 };
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function readBoundedJson(request: Request, limit: number) {
  return readBoundedBody<unknown>(request, limit, body => body.json());
}

export function readBoundedForm(request: Request, limit: number) {
  return readBoundedBody(request, limit, body => body.formData());
}
