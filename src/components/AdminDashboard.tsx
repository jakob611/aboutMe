"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowUpRight, Ban, CheckCircle2, FileText, FolderKanban, Inbox, LogOut, MessageSquare, Pencil, Plus, Search, Settings2, Star, Trash2 } from "lucide-react";
import { clearProjectDraft, readProjectDraft, PROJECT_DRAFT_CLEAR_EVENT, type AdminProject, type ProjectDraft, type ProjectEditorForm } from "@/lib/project-editor";
import { PROJECT_CATEGORY_IDS, getProjectCategoryLabels, projectCategoryLabel, normalizeProjectCategory } from "@/lib/project-categories";
import { AdminProjectEditor } from "@/components/AdminProjectEditor";
import { AdminCV } from "@/components/AdminCV";
import { AdminSiteContent } from "@/components/AdminSiteContent";
import { clearSiteContentDraft, SITE_CONTENT_DRAFT_CLEAR_EVENT } from "@/lib/site-content-draft";
import { AdminBlocks, AdminComments, AdminMessages } from "@/components/AdminModeration";
import styles from "./AdminDashboard.module.css";

export type { AdminProject } from "@/lib/project-editor";
export type AdminMessage = { id: number; name: string; email: string; subject: string | null; message: string; createdAt: string };
type Props = { projects: AdminProject[]; messages: AdminMessage[]; loadError?: string };
type Editing = { id: number | "new"; initialDraft?: ProjectEditorForm };
type Tab = "projects" | "messages" | "cv" | "content" | "comments" | "blocks";
const sections = [
  { id: "projects", label: "Projects", detail: "Images, descriptions and links", icon: FolderKanban, group: "Your website" },
  { id: "content", label: "Pages & wording", detail: "Text, links and visible sections", icon: Settings2, group: "Your website" },
  { id: "cv", label: "Your CV", detail: "The PDF visitors can download", icon: FileText, group: "Your website" },
  { id: "messages", label: "Messages", detail: "Enquiries from your contact form", icon: Inbox, group: "Conversations" },
  { id: "comments", label: "Comments", detail: "Review project discussions", icon: MessageSquare, group: "Conversations" },
  { id: "blocks", label: "Blocked addresses", detail: "Manage submission restrictions", icon: Ban, group: "Conversations" },
] as const;

export function AdminDashboard({ projects, messages, loadError }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("projects");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [pendingDraft, setPendingDraft] = useState<ProjectDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const labels = getProjectCategoryLabels("en");
  const section = sections.find(item => item.id === tab)!;
  const visibleProjects = projects.filter(project =>
    (category === "all" || normalizeProjectCategory(project.category) === category) &&
    `${project.titleEn} ${project.titleSl} ${project.slug} ${project.linkUrl ?? ""} ${project.repoUrl ?? ""} ${(project.tags ?? []).join(" ")}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ).sort((a, b) => sort === "title" ? a.titleEn.localeCompare(b.titleEn) : sort === "featured" ? Number(b.featured) - Number(a.featured) || Date.parse(b.createdAt) - Date.parse(a.createdAt) : Date.parse(b.createdAt) - Date.parse(a.createdAt));

  useEffect(() => {
    try { const draft = readProjectDraft(window.sessionStorage); if (draft) startTransition(() => setPendingDraft(draft)); }
    catch { /* Editing remains available without storage. */ }
  }, []);
  const clearDraft = () => { try { clearProjectDraft(window.sessionStorage); } catch { /* Storage may be disabled. */ } setPendingDraft(null); };
  const closeEditor = () => { clearDraft(); setEditing(null); setBusy(false); setError(null); };
  const openEditor = (id: number | "new") => { setEditing({ id }); setError(null); setStatus(null); };
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
  const editorLocked = busy || Boolean(editing || pendingDraft);

  return <section className={styles.shell} aria-label="Website administration">
    <aside className={styles.sidebar}>
      <div className={styles.identity}><span className="section-label">Behind the scenes</span><h1>Your website<span>.</span></h1><p>A place to keep things up to date.</p></div>
      <nav aria-label="Dashboard sections" className={styles.navigation}>
        {["Your website", "Conversations"].map(group => <div key={group} className={styles.navGroup}>
          <p className={styles.groupLabel}>{group}</p>
          {sections.filter(item => item.group === group).map(({ id, label, icon: Icon }) => <button key={id} type="button" disabled={busy} onClick={() => { setTab(id); setStatus(null); setError(null); }} aria-pressed={tab === id} className={styles.navItem}>
            <Icon size={17} aria-hidden="true" /><span>{label}</span>{id === "projects" && <span className={styles.count}>{projects.length}</span>}
          </button>)}
        </div>)}
      </nav>
      <div className={styles.sidebarFooter}><a href="/" target="_blank" rel="noreferrer">View website <ArrowUpRight size={15} /></a><button type="button" onClick={() => void logout()} disabled={busy}><LogOut size={15} /> Sign out</button><p>This browser stays signed in for up to 7 days.</p></div>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.header}><div><p className={styles.breadcrumb}>Website / {section.label}</p><h2>{section.label}</h2><p>{section.detail}</p></div><span className={styles.privateLabel}>Private workspace</span></header>
      {loadError && (tab === "projects" || tab === "messages") && <p role="alert" className={styles.notice}>{loadError} Pages & wording and CV remain available independently.</p>}
      {status && <p role="status" className="mb-4 flex gap-2 text-sm text-emerald-200"><CheckCircle2 size={16} />{status}</p>}
      {error && <p role="alert" className="mb-4 flex gap-2 text-sm text-rose-200"><AlertCircle size={16} />{error}</p>}
      <div hidden={tab !== "projects"}>
        {pendingDraft && !editing && <section aria-label="Saved project draft" className={styles.notice}><h3 className="font-medium">Pick up where you left off</h3><p className="mt-1 text-sm">{pendingDraft.form.titleEn || "Untitled project"} has an unsaved draft in this tab.</p>{missingDraftRecord && <p className="mt-2 text-sm">The original project is not loaded. Reconnect before resuming.</p>}<div className="mt-3 flex flex-wrap gap-3"><button type="button" className="btn-primary text-sm" disabled={Boolean(missingDraftRecord)} onClick={() => { setEditing({ id: pendingDraft.projectId, initialDraft: pendingDraft.form }); setPendingDraft(null); }}>Resume draft</button><button type="button" className="btn-ghost text-sm" onClick={clearDraft}>Discard saved draft</button></div></section>}
        <div className={styles.toolbar}><label className={styles.search}><Search size={17} aria-hidden="true" /><span className="sr-only">Search projects</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a project, tag or URL…" /></label><button type="button" disabled={editorLocked} onClick={() => openEditor("new")} className="btn-primary text-sm"><Plus size={16} />Add project</button></div>
        <div className={styles.filters}><label>Category<select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{PROJECT_CATEGORY_IDS.map(id => <option key={id} value={id}>{labels[id]}</option>)}</select></label><label>Order<select value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Newest first</option><option value="title">Name A–Z</option><option value="featured">Featured first</option></select></label><span role="status">{visibleProjects.length} of {projects.length} projects</span></div>
        <div className={`${styles.projectLayout} ${editing ? styles.withEditor : ""}`}>
          <div className="min-w-0">
            {visibleProjects.length === 0 ? <div className={styles.empty}><FolderKanban size={28} /><h3>{loadError ? "Projects couldn’t be loaded" : projects.length ? "No projects match" : "Your next project starts here"}</h3><p>{loadError ? "You can still prepare a new draft." : projects.length ? "Try a different name or category." : "Add a description and a few images to give visitors something to explore."}</p>{projects.length > 0 && <button type="button" className="btn-ghost mt-4" onClick={() => { setSearch(""); setCategory("all"); }}>Clear filters</button>}</div> : <ul className={styles.projectList}>{visibleProjects.map(project => <li key={project.id} className={styles.projectRow} data-editing={editing?.id === project.id}>
              {project.coverImage ? <img src={project.coverImage} alt="" loading="lazy" className={styles.thumbnail} /> : <div className={styles.thumbnail}><FolderKanban size={23} aria-hidden="true" /></div>}
              <div className={styles.projectInfo}><h3>{project.titleEn}{project.featured && <Star size={13} aria-label="Featured" />}</h3><p>/{project.slug}</p><span className={styles.category}>{projectCategoryLabel(project.category, "en")}</span></div>
              <div className={styles.rowActions}><a href={`/projects/${encodeURIComponent(project.slug)}?lang=en`} target="_blank" rel="noreferrer" aria-label={`View ${project.titleEn}`} title="View public project"><ArrowUpRight size={17} /></a><button type="button" disabled={editorLocked || Boolean(loadError)} onClick={() => openEditor(project.id)} aria-label={`Edit ${project.titleEn}`} title="Edit project"><Pencil size={16} /></button><button type="button" disabled={editorLocked || Boolean(loadError)} onClick={() => void removeProject(project)} aria-label={`Delete ${project.titleEn}`} title="Delete project" className={styles.delete}><Trash2 size={15} /></button></div>
            </li>)}</ul>}
            <p className={styles.help}>Saved projects are public. The homepage sketchbook uses the newest project in each category.</p>
          </div>
          {editing && <AdminProjectEditor key={editing.id} project={editRecord} initialDraft={editing.initialDraft} databaseUnavailable={Boolean(loadError)} onBusy={setBusy} onCancel={closeEditor} onSaved={message => { closeEditor(); setStatus(message); router.refresh(); }} />}
        </div>
      </div>
      {tab === "content" && <AdminSiteContent onBusy={setBusy} />}
      {tab === "cv" && <AdminCV />}
      {tab === "messages" && <AdminMessages initialMessages={messages} loadError={loadError} />}
      {tab === "comments" && <AdminComments />}
      {tab === "blocks" && <AdminBlocks />}
    </div>
  </section>;
}
