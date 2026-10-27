"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { PROJECT_CATEGORY_IDS, getProjectCategoryLabels, type ProjectCategory } from "@/lib/project-categories";
import { normalizeProjectLink, projectInputSchema, projectFieldErrors, type ProjectFieldErrors } from "@/lib/project-input";
import { clearProjectDraft, emptyProjectForm, projectFormFromRecord, projectPayloadFromForm, saveProjectDraft, updateProjectForm, PROJECT_DRAFT_CLEAR_EVENT, type AdminProject, type ProjectEditorForm } from "@/lib/project-editor";
import { MAX_PROJECT_IMAGES } from "@/lib/project-media";
import { ProjectMediaEditor } from "@/components/ProjectMediaEditor";

type Props = { project: AdminProject | null; initialDraft?: ProjectEditorForm; databaseUnavailable: boolean; onSaved: (message: string) => void; onCancel: () => void; onBusy: (busy: boolean) => void };
export function AdminProjectEditor({ project, initialDraft, databaseUnavailable, onSaved, onCancel, onBusy }: Props) {
  const [form, setForm] = useState<ProjectEditorForm>(() => initialDraft ?? (project ? projectFormFromRecord(project) : emptyProjectForm()));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<ProjectFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const stopDraft = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const busy = saving || uploading;
  useEffect(() => { onBusy(busy); }, [busy, onBusy]);
  useEffect(() => {
    const stop = () => { stopDraft.current = true; };
    window.addEventListener(PROJECT_DRAFT_CLEAR_EVENT, stop);
    return () => window.removeEventListener(PROJECT_DRAFT_CLEAR_EVENT, stop);
  }, []);
  useEffect(() => {
    if (!dirty || stopDraft.current) return;
    const persist = () => {
      if (stopDraft.current) return false;
      return saveProjectDraft(window.sessionStorage, { projectId: project?.id ?? "new", savedAt: Date.now(), form });
    };
    const timer = window.setTimeout(() => {
      try { setDraftSaved(persist()); }
      catch { setDraftSaved(false); }
    }, 350);
    const flush = () => { try { persist(); } catch { /* Storage may be disabled. */ } };
    window.addEventListener("pagehide", flush);
    return () => { window.clearTimeout(timer); window.removeEventListener("pagehide", flush); };
  }, [dirty, form, project?.id]);

  function update<K extends keyof ProjectEditorForm>(key: K, value: ProjectEditorForm[K]) {
    setForm(current => updateProjectForm(current, key, value, !project)); setDirty(true); setDraftSaved(false);
    setErrors(current => Object.fromEntries(Object.entries(current).filter(([field]) => field !== key && !field.startsWith(`${key}.`))));
  }
  const discard = () => {
    stopDraft.current = true;
    try { clearProjectDraft(window.sessionStorage); } catch { /* Storage may be disabled. */ }
    onCancel();
  };
  const upload = async (files: File[], kind: "cover" | "gallery") => {
    if (busy || !files.length) return;
    if (kind === "cover" && files.length > 1) { setError("Drop one cover image at a time."); return; }
    if (kind === "gallery" && files.length + form.gallery.images.length > MAX_PROJECT_IMAGES) { setError(`A project can have up to ${MAX_PROJECT_IMAGES} gallery photos.`); return; }
    if (files.some(file => !["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(file.type) || file.size === 0 || file.size > 12 * 1024 * 1024)) { setError("Choose JPEG, PNG, WebP, GIF or AVIF images, each nonempty and at most 12 MiB."); return; }
    setUploading(true); setError(null);
    try {
      for (const file of files) {
        const data = new FormData(); data.append("file", file);
        const response = await fetch("/api/admin/upload", { method: "POST", body: data });
        const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
        if (!response.ok || !result.url) throw new Error(result.error || `Could not upload ${file.name}.`);
        setDirty(true); setDraftSaved(false);
        setForm(current => kind === "cover" ? { ...current, coverImage: result.url!, gallery: { ...current.gallery, coverCaptionEn: "", coverCaptionSl: "" } } : { ...current, gallery: { ...current.gallery, images: [...current.gallery.images, { url: result.url!, captionEn: "", captionSl: "" }] } });
      }
    } catch (failure) { setError(`${failure instanceof Error ? failure.message : "Upload failed."} Successfully uploaded photos remain in your draft.`); }
    finally { setUploading(false); }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setError(null);
    const parsed = projectInputSchema.safeParse(projectPayloadFromForm(form));
    if (!parsed.success) {
      setErrors(projectFieldErrors(parsed.error.issues));
      setError("Check the highlighted fields. Your draft has not been changed.");
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    if (databaseUnavailable) { setError("The project database is unavailable. You can prepare this draft and upload images, but cannot publish it until the connection is restored."); return; }
    setErrors({}); setSaving(true);
    try {
      const response = await fetch(project ? `/api/admin/projects/${project.id}` : "/api/admin/projects", { method: project ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json().catch(() => ({})) as { ok?: boolean; project?: unknown; error?: string; fieldErrors?: ProjectFieldErrors };
      if (!response.ok || result.ok !== true || !result.project) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        throw new Error(result.error || "Could not confirm that the project was saved.");
      }
      stopDraft.current = true;
      try { clearProjectDraft(window.sessionStorage); } catch { /* Storage may be disabled. */ }
      onSaved(project ? "Project updated." : "Project created.");
    } catch (failure) { setError(`${failure instanceof Error ? failure.message : "Save failed."} Your draft is still in this editor.`); }
    finally { setSaving(false); }
  };
  const textField = (key: Exclude<keyof ProjectEditorForm, "category" | "gallery" | "featured">, label: string, max: number, multiline = false, required = false) => {
    const props = { id: `project-${key}`, name: key, value: form[key], maxLength: max, "aria-invalid": Boolean(errors[key]), "aria-describedby": errors[key] ? `project-${key}-error` : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(key, event.target.value), onBlur: key === "linkUrl" || key === "repoUrl" ? () => {
      const normalized = normalizeProjectLink(form[key]);
      if (normalized === null || normalized.length > 500) setErrors(current => ({ ...current, [key]: [normalized === null ? "Enter a valid http or https link, or a domain such as glowupp.org." : "The complete link, including https://, must be at most 500 characters."] }));
      else if (normalized !== form[key]) update(key, normalized);
    } : undefined };
    return <label className="block text-sm" htmlFor={props.id}><span className="mb-1.5 block text-[color:var(--color-fg-muted)]">{label}{required ? " *" : ""}</span>
      {multiline ? <textarea {...props} rows={key.startsWith("description") ? 7 : 3} className="textarea" /> : <input {...props} className="input" inputMode={key.endsWith("Url") ? "url" : undefined} />}
      {errors[key] && <span id={`project-${key}-error`} className="mt-1 block text-xs text-rose-300">{errors[key].join(" ")}</span>}
    </label>;
  };
  return <form ref={formRef} onSubmit={save} noValidate className="min-w-0 rounded-2xl border border-white/10 bg-[color:var(--color-surface)] p-5 sm:p-7">
    <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{project ? "Edit project" : "New project"}</h2><button type="button" disabled={busy} className="btn-ghost min-h-10 p-2" onClick={discard} aria-label="Cancel and close editor"><X size={18} /></button></div>
    <p className="mb-4 text-xs leading-relaxed text-[color:var(--color-fg-muted)]">Required text has an asterisk. Both languages are saved together. Photo changes appear on this project only after Save project. Removing a photo here does not delete its stored file.</p>
    {databaseUnavailable && <p role="status" className="mb-4 rounded-lg border border-amber-300/25 p-3 text-sm text-amber-100">The database is unavailable. Draft editing and image uploads remain available; Save project is blocked until it reconnects.</p>}
    {error && <div role="alert" className="mb-4 rounded-lg border border-rose-300/25 p-3 text-sm text-rose-200"><p className="flex gap-2"><AlertCircle className="mt-0.5 shrink-0" size={16} />{error}</p>{Object.keys(errors).length > 0 && <ul className="mt-2 list-disc space-y-1 pl-6">{Object.entries(errors).map(([field, messages]) => <li key={field}>{field}: {messages.join(" ")}</li>)}</ul>}</div>}
    <fieldset disabled={busy} className="min-w-0 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">{textField("titleEn", "Title (EN)", 200, false, true)}{textField("titleSl", "Title (SL)", 200, false, true)}</div>
      <div className="grid gap-4 sm:grid-cols-2">{textField("slug", "Slug", 120, false, true)}<label className="text-sm"><span className="mb-1.5 block text-[color:var(--color-fg-muted)]">Category *</span><select className="select" name="category" value={form.category} onChange={event => update("category", event.target.value as ProjectCategory)}>{PROJECT_CATEGORY_IDS.map(category => <option key={category} value={category}>{getProjectCategoryLabels("en")[category]}</option>)}</select></label></div>
      {textField("summaryEn", "Short summary (EN)", 2000, true, true)}{textField("summarySl", "Short summary (SL)", 2000, true, true)}
      {textField("descriptionEn", "Description (EN)", 50000, true, true)}{textField("descriptionSl", "Description (SL)", 50000, true, true)}
      {textField("tags", "Tags (comma-separated)", 1000)}
      <div className="grid gap-4 sm:grid-cols-2">{textField("linkUrl", "Live URL", 500)}{textField("linkLabel", "Link label", 100)}</div>
      <p className="-mt-2 text-xs text-[color:var(--color-fg-muted)]">A bare domain such as glowupp.org is saved as https://glowupp.org/. Only http and https links are accepted.</p>
      {textField("repoUrl", "Repository URL (optional)", 500)}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={form.gallery.sourceVisibility === "closed"} onChange={event => update("gallery", { ...form.gallery, sourceVisibility: event.target.checked ? "closed" : "unspecified" })} /><span>Not open source<span className="mt-1 block text-xs text-[color:var(--color-fg-muted)]">Show a closed-source label and hide the repository link publicly. Any existing repository URL is kept privately.</span></span></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={form.featured} onChange={event => update("featured", event.target.checked)} /><span>Mark as featured<span className="mt-1 block text-xs text-[color:var(--color-fg-muted)]">Keeps this project’s featured marker. The Home sketchbook always shows the newest projects.</span></span></label>
      <ProjectMediaEditor coverImage={form.coverImage} media={form.gallery} errors={errors} disabled={busy} uploading={uploading} onUpload={(files, kind) => void upload(files, kind)} onChange={(media, coverImage) => { update("gallery", media); update("coverImage", coverImage); }} />
      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5"><button type="submit" disabled={busy || databaseUnavailable} className="btn-primary flex-1">{saving ? <><Loader2 className="animate-spin" size={16} /> Saving…</> : "Save project"}</button><button type="button" disabled={busy} onClick={discard} className="btn-ghost">Cancel draft</button></div>
    </fieldset>
    <p role="status" className="mt-4 text-xs text-[color:var(--color-fg-muted)]">{draftSaved ? "Draft saved in this tab for up to two hours. Save, Cancel or Sign out clears it." : "Drafts stay in this tab. If browser storage is blocked, keep this editor open until saved."}</p>
  </form>;
}
