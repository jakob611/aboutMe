"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Upload,
  LockKeyhole,
  UnlockKeyhole,
  File as FileIcon,
  Trash2,
  Cloud,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
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
  thumbnailLink?: string;
};
type Props = { initialFiles: DbFile[]; lang: Lang; unavailable?: boolean };

// An empty upload is only an authentication probe when the server explicitly
// confirms the missing-file error. A rate limit or server error is never success.
export function isValidUploadPasswordProbe(status: number, body: unknown) {
  return (
    status === 400 &&
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    body.error === "No file provided"
  );
}

function safeWebUrl(value: string | undefined) {
  if (!value) return "";
  try {
    return ["https:", "http:"].includes(new URL(value).protocol) ? value : "";
  } catch {
    return "";
  }
}

export function FilesClient({
  initialFiles,
  lang,
  unavailable = false,
}: Props) {
  const t = translations[lang].files;
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<null | "ok" | "err">(null);
  const [uploadError, setUploadError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveConfigured, setDriveConfigured] = useState(false);
  const [driveUnavailable, setDriveUnavailable] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const limitedMessage =
    lang === "sl"
      ? "Preveč poskusov. Počakaj minuto in poskusi znova."
      : "Too many attempts. Wait a minute and try again.";
  const unavailableMessage =
    lang === "sl"
      ? "Storitev trenutno ni na voljo. Poskusi znova pozneje."
      : "The service is unavailable right now. Please try again later.";
  const responseMessage = (status: number) =>
    status === 401
      ? t.wrongPassword
      : status === 429
        ? limitedMessage
        : unavailableMessage;

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/drive", { signal: controller.signal });
        const data = (await res.json()) as {
          configured?: boolean;
          files?: DriveFile[];
        };
        if (controller.signal.aborted) return;
        setDriveConfigured(data.configured === true);
        setDriveUnavailable(!res.ok);
        setDriveFiles(data.files ?? []);
      } catch {
        if (!controller.signal.aborted) setDriveConfigured(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const tryUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPwError(null);
    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("password", password);
        const res = await fetch("/api/files", { method: "POST", body: form });
        const body: unknown = await res.json().catch(() => null);
        if (!isValidUploadPasswordProbe(res.status, body)) {
          setPwError(responseMessage(res.status));
          return;
        }
        setUnlocked(true);
      } catch {
        setPwError(unavailableMessage);
      }
    });
  };

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile || !password || unavailable) return;
    if (selectedFile.size > 50 * 1024 * 1024) {
      setUploadError(
        lang === "sl"
          ? "Datoteka je prevelika. Največja velikost je 50 MB."
          : "The file is too large. The maximum size is 50 MB.",
      );
      setUploadMsg("err");
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    try {
      const form = new FormData();
      form.append("password", password);
      form.append("file", selectedFile);
      form.append("description", description);
      const res = await fetch("/api/files", { method: "POST", body: form });
      if (!res.ok) {
        setUploadError(
          res.status === 413
            ? lang === "sl"
              ? "Datoteka je prevelika. Največja velikost je 50 MB."
              : "The file is too large. The maximum size is 50 MB."
            : responseMessage(res.status),
        );
        setUploadMsg("err");
        if (res.status === 401) {
          setUnlocked(false);
          setPwError(t.wrongPassword);
        }
        return;
      }
      const data = (await res.json()) as { file?: DbFile };
      if (!data.file) throw new Error("Missing uploaded file");
      setFiles((previous) => [data.file!, ...previous]);
      setSelectedFile(null);
      setDescription("");
      setUploadMsg("ok");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setUploadError(t.uploadError);
      setUploadMsg("err");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: number) => {
    if (!password || removingId !== null) return;
    setRemovingId(id);
    setRemoveError(null);
    try {
      const res = await fetch(`/api/files?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${password}` },
      });
      if (!res.ok) {
        setRemoveError(responseMessage(res.status));
        if (res.status === 401) {
          setUnlocked(false);
          setPwError(t.wrongPassword);
        }
        return;
      }
      setFiles((previous) => previous.filter((file) => file.id !== id));
    } catch {
      setRemoveError(
        lang === "sl"
          ? "Brisanje ni uspelo. Datoteka ostaja na seznamu."
          : "Could not delete the file. It remains in the list.",
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-14">
      <div className="lg:col-span-7">
        <Reveal>
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <h2 className="text-xl font-medium tracking-tight">
              {t.downloadsTitle}
            </h2>
            {!unavailable && (
              <span className="font-mono text-xs text-[color:var(--color-fg-muted)]">
                {String(files.length).padStart(2, "0")}
              </span>
            )}
          </div>
        </Reveal>
        {unavailable ? (
          <Reveal>
            <div className="surface-panel rounded-2xl p-7 sm:p-9" role="status">
              <AlertCircle
                aria-hidden="true"
                size={22}
                className="mb-5 text-[color:var(--color-accent-2)]"
              />
              <h3 className="text-lg font-medium">
                {lang === "sl"
                  ? "Knjižnica trenutno ni dostopna."
                  : "The library is temporarily unavailable."}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                {lang === "sl"
                  ? "Seznama datotek ni bilo mogoče naložiti. Poskusi znova malo pozneje."
                  : "The file list could not be loaded. Please try again a little later."}
              </p>
              <button
                type="button"
                onClick={() => router.refresh()}
                className="btn-ghost mt-6 text-sm"
              >
                <RefreshCw aria-hidden="true" size={14} />
                {lang === "sl" ? "Poskusi znova" : "Try again"}
              </button>
            </div>
          </Reveal>
        ) : files.length === 0 ? (
          <Reveal>
            <div className="surface-panel rounded-2xl p-7 sm:p-9">
              <FileIcon
                aria-hidden="true"
                size={24}
                className="mb-5 text-[color:var(--color-fg-muted)]"
              />
              <h3 className="text-lg font-medium">
                {lang === "sl"
                  ? "Še nič za prenos."
                  : "Nothing to download just yet."}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                {lang === "sl"
                  ? "Ko bom imel kaj uporabnega za deliti, bo na voljo tukaj."
                  : "When I have something useful to share, it will be available here."}
              </p>
            </div>
          </Reveal>
        ) : (
          <ul className="space-y-3">
            {files.map((file, index) => (
              <li key={file.id}>
                <Reveal delay={Math.min(index * 0.03, 0.2)}>
                  <div className="surface-panel flex flex-wrap items-center gap-4 rounded-xl p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10">
                      <FileIcon
                        aria-hidden="true"
                        size={19}
                        className="text-[color:var(--color-accent-2)]"
                      />
                    </div>
                    <div className="min-w-0 flex-1 basis-36">
                      <h3 className="break-words text-sm font-medium">
                        {file.originalName}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color:var(--color-fg-muted)]">
                        <span>{formatBytes(file.size)}</span>
                        <span>{formatDate(file.createdAt, lang)}</span>
                      </div>
                      {file.description && (
                        <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                          {file.description}
                        </p>
                      )}
                    </div>
                    <a
                      href={`/api/files/download?id=${file.id}`}
                      className="btn-ghost shrink-0 text-xs"
                      download
                    >
                      <Download aria-hidden="true" size={14} />
                      {t.download}
                      <span className="sr-only"> {file.originalName}</span>
                    </a>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        )}

        {driveConfigured && (
          <section className="mt-12">
            <Reveal>
              <div className="mb-6 border-b border-white/10 pb-4">
                <p className="section-label mb-3">Google Drive</p>
                <h2 className="flex items-center gap-2 text-xl font-medium">
                  <Cloud aria-hidden="true" size={19} />
                  {t.driveTitle}
                </h2>
                <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">
                  {t.driveSubtitle}
                </p>
              </div>
            </Reveal>
            {driveUnavailable ? (
              <p
                role="status"
                className="surface-panel rounded-xl p-5 text-sm text-[color:var(--color-fg-muted)]"
              >
                {lang === "sl"
                  ? "Datoteke iz Drive trenutno niso dosegljive. Poskusi znova pozneje."
                  : "Drive files are unavailable right now. Please try again later."}
              </p>
            ) : driveFiles.length === 0 ? (
              <p className="surface-panel rounded-xl p-5 text-sm text-[color:var(--color-fg-muted)]">
                {t.driveNotConfigured}
              </p>
            ) : (
              <ul className="space-y-3">
                {driveFiles.map((file, index) => {
                  const href =
                    safeWebUrl(file.webViewLink) ||
                    safeWebUrl(file.webContentLink);
                  const thumbnail = safeWebUrl(file.thumbnailLink);
                  return (
                    <li key={file.id}>
                      <Reveal delay={Math.min(index * 0.03, 0.2)}>
                        <div className="surface-panel flex flex-wrap items-center gap-4 rounded-xl p-5">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt=""
                              width={44}
                              height={44}
                              loading="lazy"
                              className="h-11 w-11 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10">
                              <FileIcon aria-hidden="true" size={19} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 basis-36">
                            <h3 className="break-words text-sm font-medium">
                              {file.name}
                            </h3>
                            <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                              {[
                                file.size ? formatBytes(Number(file.size)) : "",
                                file.modifiedTime
                                  ? formatDate(file.modifiedTime, lang)
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          {href && (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-ghost shrink-0 text-xs"
                            >
                              {t.driveOpen}
                              <ArrowUpRight aria-hidden="true" size={14} />
                              <span className="sr-only">
                                {lang === "sl"
                                  ? "Odpre se v novem zavihku"
                                  : "Opens in a new tab"}
                              </span>
                            </a>
                          )}
                        </div>
                      </Reveal>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      <Reveal className="lg:col-span-5">
        <aside className="surface-panel rounded-2xl p-6 sm:p-8">
          <p className="section-label mb-5">
            {lang === "sl" ? "Za lastnika strani" : "For the site owner"}
          </p>
          <h2 className="flex items-center gap-2 text-xl font-medium">
            {unlocked ? (
              <UnlockKeyhole aria-hidden="true" size={18} />
            ) : (
              <LockKeyhole aria-hidden="true" size={18} />
            )}
            {t.uploadTitle}
          </h2>
          <p className="mb-6 mt-3 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
            {t.uploadHint}
          </p>
          {unavailable && (
            <p className="mb-5 text-sm text-[color:var(--color-fg-muted)]">
              {lang === "sl"
                ? "Nalaganje bo spet na voljo, ko bo knjižnica dosegljiva."
                : "Uploads will be available again when the library reconnects."}
            </p>
          )}
          {!unlocked ? (
            <form onSubmit={tryUnlock} aria-busy={pending}>
              <fieldset
                disabled={pending || unavailable}
                className="min-w-0 space-y-4"
              >
                <label className="block">
                  <span className="mb-2 block text-sm">{t.password}</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="input"
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending || unavailable}
                  className="btn-primary w-full justify-center disabled:opacity-50"
                >
                  {pending ? (
                    <>
                      <Loader2
                        aria-hidden="true"
                        size={14}
                        className="animate-spin"
                      />
                      {translations[lang].common.loading}
                    </>
                  ) : (
                    t.unlock
                  )}
                </button>
              </fieldset>
              {pwError && (
                <p
                  role="alert"
                  className="mt-4 flex items-start gap-2 text-sm text-rose-300"
                >
                  <AlertCircle
                    aria-hidden="true"
                    size={15}
                    className="mt-0.5 shrink-0"
                  />
                  {pwError}
                </p>
              )}
            </form>
          ) : (
            <>
              <form onSubmit={upload} aria-busy={uploading}>
                <fieldset
                  disabled={uploading || unavailable}
                  className="min-w-0 space-y-4"
                >
                  <p className="flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 aria-hidden="true" size={14} />
                    {t.unlocked}
                  </p>
                  <label className="block">
                    <span className="mb-2 block text-sm">{t.selectFile}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      required
                      onChange={(event) => {
                        setSelectedFile(event.target.files?.[0] ?? null);
                        setUploadMsg(null);
                      }}
                      className="input file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-[color:var(--color-fg)]"
                    />
                  </label>
                  <p className="text-xs text-[color:var(--color-fg-muted)]">
                    {selectedFile
                      ? `${selectedFile.name} · ${formatBytes(selectedFile.size)}`
                      : lang === "sl"
                        ? "Največja velikost: 50 MB."
                        : "Maximum file size: 50 MB."}
                  </p>
                  <label className="block">
                    <span className="mb-2 block text-sm">{t.description}</span>
                    <input
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      className="input"
                      maxLength={500}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={uploading || unavailable || !selectedFile}
                    className="btn-primary w-full justify-center disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2
                          aria-hidden="true"
                          size={14}
                          className="animate-spin"
                        />
                        {t.uploading}
                      </>
                    ) : (
                      <>
                        <Upload aria-hidden="true" size={14} />
                        {t.upload}
                      </>
                    )}
                  </button>
                </fieldset>
                {uploadMsg === "ok" && (
                  <p
                    role="status"
                    className="mt-4 flex items-start gap-2 text-sm text-emerald-300"
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      size={15}
                      className="mt-0.5 shrink-0"
                    />
                    {t.uploadSuccess}
                  </p>
                )}
                {uploadMsg === "err" && (
                  <p
                    role="alert"
                    className="mt-4 flex items-start gap-2 text-sm text-rose-300"
                  >
                    <AlertCircle
                      aria-hidden="true"
                      size={15}
                      className="mt-0.5 shrink-0"
                    />
                    {uploadError}
                  </p>
                )}
              </form>
              <div className="mt-7 border-t border-white/10 pt-6">
                <h3 className="section-label mb-4">
                  {lang === "sl" ? "Upravljanje datotek" : "Manage uploads"}
                </h3>
                {files.length > 0 ? (
                  <ul className="max-h-64 space-y-2 overflow-auto">
                    {files.map((file) => (
                      <li
                        key={file.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {file.originalName}
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(file.id)}
                          disabled={removingId !== null || unavailable}
                          className="rounded-md p-2 text-rose-300 transition-colors hover:bg-white/5 disabled:opacity-40"
                          aria-label={`${lang === "sl" ? "Izbriši" : "Delete"} ${file.originalName}`}
                        >
                          {removingId === file.id ? (
                            <Loader2
                              aria-hidden="true"
                              size={14}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 aria-hidden="true" size={14} />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[color:var(--color-fg-muted)]">
                    {t.noFiles}
                  </p>
                )}
                {removeError && (
                  <p role="alert" className="mt-4 text-sm text-rose-300">
                    {removeError}
                  </p>
                )}
              </div>
            </>
          )}
        </aside>
      </Reveal>
    </div>
  );
}
