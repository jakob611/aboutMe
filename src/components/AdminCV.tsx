"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import type { CVMetadata } from "@/lib/cv";

export function AdminCV() {
  const [cv, setCV] = useState<CVMetadata | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/admin/cv", { cache: "no-store", signal: controller.signal });
        const result = await response.json() as CVMetadata & { error?: string };
        if (!response.ok) throw new Error(result.error || "Could not load CV status.");
        setCV(result);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load CV status.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || publishing) return;
    setError(null);
    setStatus(null);
    if (file.type !== "application/pdf") { setError("Choose a PDF file."); return; }
    if (file.size === 0 || file.size > 10 * 1024 * 1024) { setError("Choose a non-empty PDF up to 10 MB."); return; }
    setPublishing(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/cv", { method: "POST", body });
      const result = await response.json() as CVMetadata & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not publish the CV.");
      setCV(result);
      setStatus("CV published. Download CV is now available at the bottom of About.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish the CV.");
    } finally { setPublishing(false); }
  };

  return (
    <div className="glass max-w-2xl rounded-2xl p-6 sm:p-8">
      <h2 className="text-xl font-semibold">CV</h2>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
        Upload your finished CV as a PDF, up to 10 MB. Publishing makes the whole document public and replaces any existing CV. Include only details you want to share publicly.
      </p>
      <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">
        Visitors will find Download CV at the bottom of About after you publish. Until then, the download stays hidden.
      </p>
      <div className="mt-6 border-y border-white/10 py-4 text-sm" aria-live="polite">
        {loading ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Checking publication status</span>
          : cv?.published ? <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p>Published · {((cv.fileSize ?? 0) / 1024).toFixed(0)} KB</p>
              {cv.updatedAt && <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">Updated {new Date(cv.updatedAt).toLocaleString()}</p>}
            </div>
            <a href="/api/cv" className="link-arrow" download="Jakob-Tominc-CV.pdf"><Download size={14} /> Download current CV</a>
          </div> : cv ? <p>No CV published yet.</p> : <p>Publication status unavailable.</p>}
      </div>
      <form onSubmit={publish} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span>CV PDF</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            required
            disabled={publishing}
            className="input mt-2 w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-inherit"
            onChange={event => { setFile(event.target.files?.[0] ?? null); setStatus(null); setError(null); }}
          />
        </label>
        <button type="submit" disabled={!file || publishing} className="btn-primary text-sm disabled:opacity-50">
          {publishing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {publishing ? "Publishing…" : cv?.published ? "Replace public CV" : "Publish CV"}
        </button>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        {status && <p role="status" className="text-sm text-emerald-300">{status}</p>}
      </form>
    </div>
  );
}
