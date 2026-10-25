"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FolderKanban,
  ImagePlus,
  Inbox,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { formatDate, slugify } from "@/lib/utils";

export type AdminProject = {
  id: number;
  slug: string;
  titleEn: string;
  titleSl: string;
  summaryEn: string;
  summarySl: string;
  descriptionEn: string;
  descriptionSl: string;
  category: string;
  tags: string[] | null;
  coverImage: string | null;
  gallery: string[] | null;
  linkUrl: string | null;
  linkLabel: string | null;
  repoUrl: string | null;
  featured: boolean | null;
  createdAt: string;
};

export type AdminMessage = {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  createdAt: string;
};

type FormState = {
  slug: string;
  titleEn: string;
  titleSl: string;
  summaryEn: string;
  summarySl: string;
  descriptionEn: string;
  descriptionSl: string;
  category: "android" | "lego" | "web" | "other";
  tags: string;
  coverImage: string;
  gallery: string[];
  linkUrl: string;
  linkLabel: string;
  repoUrl: string;
  featured: boolean;
};

const emptyForm = (): FormState => ({
  slug: "",
  titleEn: "",
  titleSl: "",
  summaryEn: "",
  summarySl: "",
  descriptionEn: "",
  descriptionSl: "",
  category: "web",
  tags: "",
  coverImage: "",
  gallery: [],
  linkUrl: "",
  linkLabel: "",
  repoUrl: "",
  featured: false,
});

function fromProject(p: AdminProject): FormState {
  return {
    slug: p.slug,
    titleEn: p.titleEn,
    titleSl: p.titleSl,
    summaryEn: p.summaryEn,
    summarySl: p.summarySl,
    descriptionEn: p.descriptionEn,
    descriptionSl: p.descriptionSl,
    category: (["android", "lego", "web", "other"].includes(p.category)
      ? p.category
      : "other") as FormState["category"],
    tags: (p.tags ?? []).join(", "),
    coverImage: p.coverImage ?? "",
    gallery: p.gallery ?? [],
    linkUrl: p.linkUrl ?? "",
    linkLabel: p.linkLabel ?? "",
    repoUrl: p.repoUrl ?? "",
    featured: Boolean(p.featured),
  };
}

function payloadFromForm(form: FormState) {
  return {
    slug: form.slug || slugify(form.titleEn),
    titleEn: form.titleEn,
    titleSl: form.titleSl,
    summaryEn: form.summaryEn,
    summarySl: form.summarySl,
    descriptionEn: form.descriptionEn,
    descriptionSl: form.descriptionSl,
    category: form.category,
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    coverImage: form.coverImage,
    gallery: form.gallery,
    linkUrl: form.linkUrl,
    linkLabel: form.linkLabel,
    repoUrl: form.repoUrl,
    featured: form.featured,
  };
}

type Props = { projects: AdminProject[]; messages: AdminMessage[]; loadError?: string };

export function AdminDashboard({ projects, messages, loadError }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"projects" | "messages">("projects");
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"cover" | "gallery" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = saving || uploading !== null;

  const openNew = () => {
    setEditingId("new");
    setForm(emptyForm());
    setError(null);
    setStatus(null);
  };

  const openEdit = (project: AdminProject) => {
    setEditingId(project.id);
    setForm(fromProject(project));
    setError(null);
    setStatus(null);
  };

  const closeEditor = () => {
    setEditingId(null);
    setError(null);
  };

  const logout = async () => {
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (!res.ok) throw new Error("Could not sign out.");
      window.location.replace("/admin");
    } catch { setError("Could not sign out. Try again."); }
  };

  const uploadImages = async (files: File[], kind: "cover" | "gallery") => {
    if (busy) return;
    if (kind === "gallery" && form.gallery.length + files.length > 30) { setError("A project can have up to 30 gallery photos."); return; }
    setUploading(kind);
    setError(null);
    try {
      for (const file of files) {
        if (file.size > 12 * 1024 * 1024) throw new Error("Image too large (max 12 MB).");
        const data = new FormData();
        data.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: data });
        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
        if (kind === "cover") setForm((f) => ({ ...f, coverImage: json.url! }));
        else setForm((f) => ({ ...f, gallery: [...f.gallery, json.url!] }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const removeGallery = (url: string) => {
    setForm((f) => ({ ...f, gallery: f.gallery.filter((item) => item !== url) }));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || loadError) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const isNew = editingId === "new";
      const res = await fetch(
        isNew ? "/api/admin/projects" : `/api/admin/projects/${editingId}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadFromForm(form)),
        }
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Save failed");
      setStatus(isNew ? "Project created." : "Project updated.");
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeProject = async (project: AdminProject) => {
    if (!confirm(`Delete “${project.titleEn}”? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete project.");
      if (editingId === project.id) setEditingId(null);
      setStatus("Project deleted.");
      router.refresh();
    } catch { setError("Could not delete project. Try again."); }
    finally { setSaving(false); }
  };

  const messageLabel = useMemo(
    () => `${messages.length} message${messages.length === 1 ? "" : "s"}`,
    [messages.length]
  );

  return (
    <section className="pt-12 sm:pt-16 pb-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-[color:var(--color-fg-muted)] mt-1">
              Projects, R2 images, and contact messages.
            </p>
            <p className="text-sm text-[color:var(--color-fg-muted)] mt-2">
              Signed in on this browser for up to 7 days. Sign out when you finish on a shared computer.
            </p>
          </div>
          <button type="button" onClick={logout} disabled={busy} className="btn-ghost text-sm">
            <LogOut size={14} /> Sign out
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <button
            type="button"
            onClick={() => setTab("projects")}
            className={tab === "projects" ? "btn-primary text-sm" : "btn-ghost text-sm"}
          >
            <FolderKanban size={14} /> Projects ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("messages")}
            className={tab === "messages" ? "btn-primary text-sm" : "btn-ghost text-sm"}
          >
            <Inbox size={14} /> {messageLabel}
          </button>
        </div>

        {loadError && <p role="alert" className="mb-4 text-sm text-rose-300">{loadError}</p>}
        {status && (
          <p className="mb-4 text-sm text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> {status}
          </p>
        )}
        {error && (
          <p className="mb-4 text-sm text-rose-300 flex items-center gap-1.5">
            <AlertCircle size={14} /> {error}
          </p>
        )}

        {tab === "projects" ? (
          <div className="grid lg:grid-cols-12 gap-6">
            <div className={editingId !== null ? "lg:col-span-5" : "lg:col-span-12"}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Projects</h2>
                <button type="button" onClick={openNew} disabled={busy || Boolean(loadError)} className="btn-primary text-sm">
                  <Plus size={14} /> Add project
                </button>
              </div>
              {projects.length === 0 ? (
                <div className="glass rounded-2xl p-8 text-[color:var(--color-fg-muted)]">
                  No projects yet.
                </div>
              ) : (
                <ul className="space-y-3">
                  {projects.map((project) => (
                    <li key={project.id} className="glass rounded-2xl p-4 flex gap-4">
                      {project.coverImage ? (
                        <img
                          src={project.coverImage}
                          alt=""
                          className="h-16 w-20 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-16 w-20 rounded-xl bg-white/5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate flex items-center gap-2">
                          {project.titleEn}
                          {project.featured && (
                            <Star size={14} className="text-amber-300 shrink-0" />
                          )}
                        </div>
                        <div className="text-xs text-[color:var(--color-fg-muted)] truncate">
                          /{project.slug} · {project.category}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="p-2 rounded-lg hover:bg-white/5"
                          onClick={() => openEdit(project)} disabled={busy || Boolean(loadError)}
                          aria-label="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg hover:bg-white/5 text-rose-300"
                          onClick={() => removeProject(project)} disabled={busy || Boolean(loadError)}
                          aria-label="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {editingId !== null && (
              <form
                onSubmit={save}
                className="lg:col-span-7 glass rounded-3xl p-6"
              >
                <fieldset disabled={busy || Boolean(loadError)} className="space-y-4 min-w-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                      {editingId === "new" ? "New project" : "Edit project"}
                    </h2>
                    <button type="button" onClick={closeEditor} disabled={busy || Boolean(loadError)} aria-label="Close editor" className="p-2 rounded-lg hover:bg-white/5">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Title (EN)">
                      <input
                        className="input"
                        required
                        value={form.titleEn}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            titleEn: e.target.value,
                            slug: editingId === "new" ? slugify(e.target.value) : f.slug,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Title (SL)">
                      <input
                        className="input"
                        required
                        value={form.titleSl}
                        onChange={(e) => setForm((f) => ({ ...f, titleSl: e.target.value }))}
                      />
                    </Field>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Slug">
                      <input
                        className="input"
                        required
                        value={form.slug}
                        onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                      />
                    </Field>
                    <Field label="Category">
                      <select
                        className="select"
                        value={form.category}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            category: e.target.value as FormState["category"],
                          }))
                        }
                      >
                        <option value="android">Android</option>
                        <option value="lego">Lego</option>
                        <option value="web">Web</option>
                        <option value="other">Other</option>
                      </select>
                    </Field>
                  </div>

                  <Field label="Summary (EN)">
                    <textarea
                      className="textarea"
                      required
                      value={form.summaryEn}
                      onChange={(e) => setForm((f) => ({ ...f, summaryEn: e.target.value }))}
                    />
                  </Field>
                  <Field label="Summary (SL)">
                    <textarea
                      className="textarea"
                      required
                      value={form.summarySl}
                      onChange={(e) => setForm((f) => ({ ...f, summarySl: e.target.value }))}
                    />
                  </Field>
                  <Field label="Description (EN)">
                    <textarea
                      className="textarea min-h-40"
                      required
                      value={form.descriptionEn}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, descriptionEn: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Description (SL)">
                    <textarea
                      className="textarea min-h-40"
                      required
                      value={form.descriptionSl}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, descriptionSl: e.target.value }))
                      }
                    />
                  </Field>

                  <Field label="Tags (comma-separated)">
                    <input
                      className="input"
                      value={form.tags}
                      onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    />
                  </Field>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Live URL">
                      <input
                        className="input"
                        value={form.linkUrl}
                        onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                      />
                    </Field>
                    <Field label="Link label">
                      <input
                        className="input"
                        value={form.linkLabel}
                        onChange={(e) => setForm((f) => ({ ...f, linkLabel: e.target.value }))}
                      />
                    </Field>
                  </div>
                  <Field label="Repo URL">
                    <input
                      className="input"
                      value={form.repoUrl}
                      onChange={(e) => setForm((f) => ({ ...f, repoUrl: e.target.value }))}
                    />
                  </Field>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                    />
                    Featured on the home page
                  </label>

                  <div>
                    <div className="text-sm text-[color:var(--color-fg-muted)] mb-2">
                      Cover image
                    </div>
                    {form.coverImage && (
                      <img
                        src={form.coverImage}
                        alt=""
                        className="mb-3 w-full max-h-48 object-cover rounded-xl border border-white/10"
                      />
                    )}
                    {form.coverImage && <button type="button" className="btn-ghost text-sm mb-2" onClick={() => setForm(f => ({ ...f, coverImage: "" }))}>Remove cover</button>}
                    <label className="btn-ghost text-sm cursor-pointer inline-flex">
                      {uploading === "cover" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ImagePlus size={14} />
                      )}
                      Upload cover
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void uploadImages([file], "cover");
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  <div>
                    <div className="text-sm text-[color:var(--color-fg-muted)] mb-2">
                      Gallery
                    </div>
                    {form.gallery.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {form.gallery.map((url) => (
                          <div key={url} className="relative">
                            <img
                              src={url}
                              alt=""
                              className="h-24 w-full object-cover rounded-lg border border-white/10"
                            />
                            <button
                              type="button"
                              onClick={() => void removeGallery(url)}
                              className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-rose-200"
                              aria-label="Remove photo"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="btn-ghost text-sm cursor-pointer inline-flex">
                      {uploading === "gallery" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ImagePlus size={14} />
                      )}
                      Upload photos
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = [...(e.target.files ?? [])];
                          if (files.length) void uploadImages(files, "gallery");
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={busy || Boolean(loadError)}
                    className="btn-primary w-full justify-center disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Saving
                      </>
                    ) : (
                      "Save project"
                    )}
                  </button>
                </fieldset>
              </form>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-semibold">Contact messages</h2><button type="button" className="btn-ghost text-sm" onClick={() => router.refresh()}>Refresh</button></div>
            {messages.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-[color:var(--color-fg-muted)]">
                No messages yet.
              </div>
            ) : (
              <ul className="space-y-3">
                {messages.map((msg) => (
                  <li key={msg.id} className="glass rounded-2xl p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-medium">{msg.name}</div>
                      <div className="text-xs text-[color:var(--color-fg-muted)]">
                        {formatDate(msg.createdAt, "en")}
                      </div>
                    </div>
                    <a
                      href={`mailto:${msg.email}`}
                      className="text-sm text-[#22d3ee] hover:underline"
                    >
                      {msg.email}
                    </a>
                    {msg.subject && (
                      <div className="mt-1 text-sm font-medium">{msg.subject}</div>
                    )}
                    <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] whitespace-pre-wrap">
                      {msg.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm text-[color:var(--color-fg-muted)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
