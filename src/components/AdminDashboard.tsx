"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileText, FolderKanban, Inbox, LogOut, Pencil, Plus, Settings2, Star, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { clearProjectDraft, readProjectDraft, PROJECT_DRAFT_CLEAR_EVENT, type AdminProject, type ProjectDraft, type ProjectEditorForm } from "@/lib/project-editor";
import { AdminProjectEditor } from "@/components/AdminProjectEditor";
import { AdminCV } from "@/components/AdminCV";
import { AdminSiteContent } from "@/components/AdminSiteContent";
import { clearSiteContentDraft, SITE_CONTENT_DRAFT_CLEAR_EVENT } from "@/lib/site-content-draft";

export type { AdminProject } from "@/lib/project-editor";
export type AdminMessage = { id: number; name: string; email: string; subject: string | null; message: string; createdAt: string };
type Props = { projects: AdminProject[]; messages: AdminMessage[]; loadError?: string };
type Editing = { id: number | "new"; initialDraft?: ProjectEditorForm };

export function AdminDashboard({ projects, messages, loadError }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"projects" | "messages" | "cv" | "content">("projects");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [pendingDraft, setPendingDraft] = useState<ProjectDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    try { const draft = readProjectDraft(window.sessionStorage); if (draft) startTransition(() => setPendingDraft(draft)); }
    catch { /* Editing remains available without storage. */ }
  }, []);
  const clearDraft = () => { try { clearProjectDraft(window.sessionStorage); } catch { /* Storage may be disabled. */ } setPendingDraft(null); };
  const closeEditor = () => { clearDraft(); setEditing(null); setBusy(false); setError(null); };
  const logout = async () => {
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed.");
      window.dispatchEvent(new Event(PROJECT_DRAFT_CLEAR_EVENT));
      window.dispatchEvent(new Event(SITE_CONTENT_DRAFT_CLEAR_EVENT));
      try { clearSiteContentDraft(window.sessionStorage); } catch { /* Storage may be disabled. */ }
      clearDraft(); window.location.replace("/admin");
    } catch { setError("Could not sign out. Try again."); }
  };
  const removeProject = async (project: AdminProject) => {
    if (loadError || busy || editing) return;
    if (!confirm(`Delete “${project.titleEn}”? This cannot be undone.`)) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) throw new Error(result.error || "Could not delete project.");
      setStatus("Project deleted."); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not delete project."); }
    finally { setBusy(false); }
  };
  const editRecord = editing?.id === "new" ? null : projects.find(project => project.id === editing?.id) ?? null;
  const missingDraftRecord = pendingDraft && pendingDraft.projectId !== "new" && !projects.some(project => project.id === pendingDraft.projectId);

  return <section className="pb-24 pt-12 sm:pt-16"><div className="mx-auto max-w-7xl px-5 sm:px-8">
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1><p className="mt-1 text-[color:var(--color-fg-muted)]">Projects, images, site content, your CV, and contact messages.</p><p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">Signed in on this browser for up to 7 days. Sign out when you finish on a shared computer.</p></div><button type="button" onClick={() => void logout()} disabled={busy} className="btn-ghost text-sm"><LogOut size={14} /> Sign out</button></div>
    <nav aria-label="Dashboard sections" className="mb-8 flex flex-wrap gap-2">{([
      ["projects", <FolderKanban key="projects" size={14} />, `Projects (${projects.length})`],
      ["content", <Settings2 key="content" size={14} />, "Site content"],
      ["cv", <FileText key="cv" size={14} />, "CV"],
      ["messages", <Inbox key="messages" size={14} />, `${messages.length} messages`],
    ] as const).map(([value, icon, label]) => <button key={value} type="button" disabled={busy} onClick={() => setTab(value)} aria-pressed={tab === value} className={tab === value ? "btn-primary text-sm" : "btn-ghost text-sm"}>{icon}{label}</button>)}</nav>
    {loadError && (tab === "projects" || tab === "messages") && <p role="alert" className="mb-4 text-sm text-amber-100">{loadError} Site content and CV remain independent of this connection.</p>}
    {status && <p role="status" className="mb-4 flex gap-2 text-sm text-emerald-200"><CheckCircle2 size={16} />{status}</p>}
    {error && <p role="alert" className="mb-4 flex gap-2 text-sm text-rose-200"><AlertCircle size={16} />{error}</p>}

    <div hidden={tab !== "projects"}>
      {pendingDraft && !editing && <section aria-label="Saved project draft" className="mb-6 rounded-xl border border-[color:var(--color-accent-2)]/30 bg-white/5 p-4"><h2 className="font-medium">An unsaved project draft is available in this tab.</h2><p className="mt-1 text-sm text-[color:var(--color-fg-muted)]">{pendingDraft.form.titleEn || "Untitled project"}. Resume it or discard it before opening another editor.</p>{missingDraftRecord && <p className="mt-2 text-sm text-amber-100">The original record is not currently loaded. Reconnect the database before resuming this existing-project draft.</p>}<div className="mt-3 flex flex-wrap gap-3"><button type="button" className="btn-primary text-sm" disabled={Boolean(missingDraftRecord)} onClick={() => { setEditing({ id: pendingDraft.projectId, initialDraft: pendingDraft.form }); setPendingDraft(null); }}>Resume draft</button><button type="button" className="btn-ghost text-sm" onClick={clearDraft}>Discard saved draft</button></div></section>}
      <div className={`grid gap-6 ${editing ? "xl:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)]" : ""}`}>
        <div className="min-w-0"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Projects</h2><button type="button" disabled={busy || Boolean(editing || pendingDraft)} onClick={() => { setEditing({ id: "new" }); setError(null); setStatus(null); }} className="btn-primary text-sm"><Plus size={14} />Add project</button></div>
          {projects.length === 0 ? <div className="rounded-xl border border-white/10 p-6 text-sm text-[color:var(--color-fg-muted)]">{loadError ? "Project records could not be loaded. You can still prepare a new draft." : "No projects yet."}</div> : <ul className="space-y-3">{projects.map(project => <li key={project.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 p-4">{project.coverImage ? <img src={project.coverImage} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" /> : <div className="h-16 w-20 shrink-0 rounded-lg bg-white/5" />}<div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-medium"><span className="truncate">{project.titleEn}</span>{project.featured && <Star className="shrink-0 text-amber-200" size={14} />}</p><p className="truncate text-xs text-[color:var(--color-fg-muted)]">/{project.slug} · {project.category}</p></div><div className="flex flex-wrap gap-1"><button type="button" disabled={busy || Boolean(editing || pendingDraft) || Boolean(loadError)} onClick={() => { setEditing({ id: project.id }); setError(null); setStatus(null); }} className="rounded-lg p-2 hover:bg-white/10" aria-label={`Edit ${project.titleEn}`}><Pencil size={16} /></button><button type="button" disabled={busy || Boolean(editing || pendingDraft) || Boolean(loadError)} onClick={() => void removeProject(project)} className="rounded-lg p-2 text-rose-200 hover:bg-white/10" aria-label={`Delete ${project.titleEn}`}><Trash2 size={16} /></button></div></li>)}</ul>}
        </div>
        {editing && <AdminProjectEditor key={editing.id} project={editRecord} initialDraft={editing.initialDraft} databaseUnavailable={Boolean(loadError)} onBusy={setBusy} onCancel={closeEditor} onSaved={message => { closeEditor(); setStatus(message); router.refresh(); }} />}
      </div>
    </div>
    {tab === "content" && <AdminSiteContent />}
    {tab === "cv" && <AdminCV />}
    {tab === "messages" && <section><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Contact messages</h2><button type="button" className="btn-ghost text-sm" onClick={() => router.refresh()}>Refresh</button></div>{messages.length === 0 ? <p className="rounded-xl border border-white/10 p-6 text-[color:var(--color-fg-muted)]">{loadError ? "Messages are unavailable until the database reconnects." : "No messages yet."}</p> : <ul className="space-y-3">{messages.map(message => <li key={message.id} className="rounded-xl border border-white/10 p-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-medium">{message.name}</h3><span className="text-xs text-[color:var(--color-fg-muted)]">{formatDate(message.createdAt, "en")}</span></div><a href={`mailto:${message.email}`} className="text-sm text-[color:var(--color-accent-2)] underline">{message.email}</a>{message.subject && <p className="mt-2 text-sm font-medium">{message.subject}</p>}<p className="mt-2 whitespace-pre-wrap text-sm text-[color:var(--color-fg-muted)]">{message.message}</p></li>)}</ul>}</section>}
  </div></section>;
}
