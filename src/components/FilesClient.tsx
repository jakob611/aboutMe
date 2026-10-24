"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Download,
  Upload,
  Lock,
  Unlock,
  File as FileIcon,
  Trash2,
  Cloud,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { translations, type Lang } from "@/lib/i18n";
import { formatBytes, formatDate } from "@/lib/utils";

type DbFile = {
  id: number;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  description: string | null;
  createdAt: string | Date;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
};

type Props = { initialFiles: DbFile[]; lang: Lang };

export function FilesClient({ initialFiles, lang }: Props) {
  const t = translations[lang].files;

  const [files, setFiles] = useState<DbFile[]>(initialFiles);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<null | "ok" | "err">(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");

  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveConfigured, setDriveConfigured] = useState<boolean | null>(null);
  const [driveLoading, setDriveLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/drive");
        const data = (await res.json()) as {
          configured: boolean;
          files?: DriveFile[];
        };
        if (cancelled) return;
        setDriveConfigured(data.configured);
        setDriveFiles(data.files ?? []);
      } catch {
        if (!cancelled) setDriveConfigured(false);
      } finally {
        if (!cancelled) setDriveLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tryUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    startTransition(async () => {
      // We verify the password with a harmless request: an empty multipart
      // upload will be rejected by the server, but it tells us whether the
      // password matches without exposing anything to the client.
      try {
        const form = new FormData();
        form.append("password", password);
        const res = await fetch("/api/files", { method: "POST", body: form });
        if (res.status === 401) {
          setPwError(t.wrongPassword);
          return;
        }
        // Any other response (e.g. 400 "No file provided") means the
        // password was accepted.
        setUnlocked(true);
      } catch {
        setPwError(t.wrongPassword);
      }
    });
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !password) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const form = new FormData();
      form.append("password", password);
      form.append("file", selectedFile);
      form.append("description", description);
      const res = await fetch("/api/files", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { file: DbFile };
      setFiles((f) => [data.file, ...f]);
      setSelectedFile(null);
      setDescription("");
      setUploadMsg("ok");
    } catch {
      setUploadMsg("err");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: number) => {
    if (!password) return;
    const res = await fetch(
      `/api/files?id=${id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${password}` } }
    );
    if (res.ok) setFiles((f) => f.filter((x) => x.id !== id));
  };

  return (
    <div className="mt-12 grid lg:grid-cols-12 gap-8">
      {/* Downloads */}
      <div className="lg:col-span-7">
        <Reveal>
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
            <Download size={22} /> {t.downloadsTitle}
          </h2>
        </Reveal>
        {files.length === 0 ? (
          <Reveal>
            <div className="glass rounded-2xl p-10 text-center text-[color:var(--color-fg-muted)]">
              {t.noFiles}
            </div>
          </Reveal>
        ) : (
          <ul className="space-y-3">
            {files.map((f, i) => (
              <Reveal key={f.id} delay={Math.min(i * 0.03, 0.2)}>
                <li className="glass rounded-2xl p-4 flex items-center gap-4">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-[#7c5cff]/30 to-[#22d3ee]/30 flex items-center justify-center">
                    <FileIcon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{f.originalName}</div>
                    <div className="text-xs text-[color:var(--color-fg-muted)] flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span>
                        {t.size}: {formatBytes(f.size)}
                      </span>
                      <span>
                        {t.added}: {formatDate(f.createdAt, lang)}
                      </span>
                    </div>
                    {f.description && (
                      <p className="text-xs text-[color:var(--color-fg-muted)] mt-1 line-clamp-2">
                        {f.description}
                      </p>
                    )}
                  </div>
                  <a
                    href={`/api/files/download?id=${f.id}`}
                    className="btn-primary text-sm shrink-0"
                    download
                  >
                    <Download size={14} /> {t.download}
                  </a>
                </li>
              </Reveal>
            ))}
          </ul>
        )}

        {/* Google Drive */}
        <div className="mt-12">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
              <Cloud size={22} /> {t.driveTitle}
            </h2>
            <p className="text-[color:var(--color-fg-muted)] text-sm">
              {t.driveSubtitle}
            </p>
          </Reveal>

          <div className="mt-6">
            {driveLoading ? (
              <div className="glass rounded-2xl p-6 flex items-center gap-3 text-[color:var(--color-fg-muted)]">
                <Loader2 className="animate-spin" size={18} />
                {translations[lang].common.loading}
              </div>
            ) : driveConfigured === false ? (
              <Reveal>
                <div className="glass rounded-2xl p-6 text-sm text-[color:var(--color-fg-muted)]">
                  {t.driveNotConfigured}
                </div>
              </Reveal>
            ) : driveFiles.length === 0 ? (
              <Reveal>
                <div className="glass rounded-2xl p-6 text-sm text-[color:var(--color-fg-muted)]">
                  —
                </div>
              </Reveal>
            ) : (
              <ul className="space-y-3">
                {driveFiles.map((f, i) => (
                  <Reveal key={f.id} delay={Math.min(i * 0.03, 0.2)}>
                    <li className="glass rounded-2xl p-4 flex items-center gap-4">
                      {f.thumbnailLink ? (
                        <img
                          src={f.thumbnailLink}
                          alt=""
                          className="h-12 w-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center">
                          <FileIcon size={20} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{f.name}</div>
                        <div className="text-xs text-[color:var(--color-fg-muted)]">
                          {f.size ? formatBytes(Number(f.size)) : ""}
                          {f.modifiedTime
                            ? ` · ${formatDate(f.modifiedTime, lang)}`
                            : ""}
                        </div>
                      </div>
                      <a
                        href={f.webViewLink ?? f.webContentLink ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost text-sm shrink-0"
                      >
                        <ExternalLink size={14} /> {t.driveOpen}
                      </a>
                    </li>
                  </Reveal>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Upload (protected) */}
      <div className="lg:col-span-5">
        <Reveal>
          <div className="glass rounded-3xl p-6 sticky top-24">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
              {unlocked ? <Unlock size={18} /> : <Lock size={18} />}
              {t.uploadTitle}
            </h2>
            <p className="text-sm text-[color:var(--color-fg-muted)] mb-5">
              {t.uploadHint}
            </p>

            {!unlocked ? (
              <form onSubmit={tryUnlock} className="space-y-3">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={t.password}
                  className="input"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-primary w-full justify-center"
                >
                  {pending ? translations[lang].common.loading : t.unlock}
                </button>
                {pwError && (
                  <p className="text-sm text-rose-300 flex items-center gap-1">
                    <AlertCircle size={14} /> {pwError}
                  </p>
                )}
              </form>
            ) : (
              <form onSubmit={upload} className="space-y-3">
                <div className="text-sm text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> {t.unlocked}
                </div>
                <label className="block">
                  <span className="text-sm text-[color:var(--color-fg-muted)]">
                    {t.selectFile}
                  </span>
                  <input
                    type="file"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    className="input mt-1 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-white file:text-black file:text-sm file:font-medium"
                  />
                </label>
                {selectedFile && (
                  <div className="text-xs text-[color:var(--color-fg-muted)]">
                    {selectedFile.name} · {formatBytes(selectedFile.size)}
                  </div>
                )}
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.description}
                  className="input"
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="btn-primary w-full justify-center disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> {t.uploading}
                    </>
                  ) : (
                    <>
                      <Upload size={14} /> {t.upload}
                    </>
                  )}
                </button>
                {uploadMsg === "ok" && (
                  <p className="text-sm text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 size={14} /> {t.uploadSuccess}
                  </p>
                )}
                {uploadMsg === "err" && (
                  <p className="text-sm text-rose-300 flex items-center gap-1">
                    <AlertCircle size={14} /> {t.uploadError}
                  </p>
                )}

                {/* Admin helper: delete uploaded files */}
                <div className="pt-4 mt-2 border-t border-white/10">
                  <div className="text-xs text-[color:var(--color-fg-muted)] mb-2 uppercase tracking-wider">
                    Manage uploads
                  </div>
                  <ul className="space-y-1.5 max-h-64 overflow-auto">
                    {files.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="flex-1 truncate">
                          {f.originalName}
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(f.id)}
                          className="text-rose-300 hover:text-rose-200 p-1.5 rounded-md hover:bg-white/5"
                          aria-label="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
