"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { contentFields, defaultContentValues, type ContentValues } from "@/lib/site-content";
import { clearSiteContentDraft, readSiteContentDraft, saveSiteContentDraft, SITE_CONTENT_DRAFT_CLEAR_EVENT } from "@/lib/site-content-draft";
type Snapshot = { revision: string | null; overrides: ContentValues; defaults: ContentValues };
export function AdminSiteContent() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [draft, setDraft] = useState<ContentValues>({});
  const [baseRevision, setBaseRevision] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const stopDraft = useRef(false);
  const mounted = useRef(false);
  const [language, setLanguage] = useState<"en" | "sl">("en");
  const [group, setGroup] = useState("Home");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const dirty = snapshot !== null && JSON.stringify(draft) !== JSON.stringify(snapshot.overrides);
  const groups = [...new Set(contentFields.map(field => field.group))].sort();
  async function load() {
    setBusy(true); setError(""); setStatus("");
    try { const response = await fetch("/api/admin/site-content", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load content."); if (!mounted.current || stopDraft.current) return; clearStoredDraft(); setSnapshot(data); setDraft(data.overrides); setBaseRevision(data.revision); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not load content."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    const stop = () => { stopDraft.current = true; };
    window.addEventListener(SITE_CONTENT_DRAFT_CLEAR_EVENT, stop);
    void fetch("/api/admin/site-content", { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load content.");
      if (controller.signal.aborted || stopDraft.current) return;
      let recovered = null;
      try { recovered = readSiteContentDraft(window.sessionStorage); } catch { /* Storage may be disabled. */ }
      setSnapshot(data); setDraft(recovered?.overrides ?? data.overrides); setBaseRevision(recovered ? recovered.baseRevision : data.revision); setDraftSaved(Boolean(recovered));
      if (recovered) {
        setStatus("Recovered your unpublished changes from this tab. Draft recovery lasts up to two hours.");
        if (recovered.baseRevision !== data.revision) setError("Published content changed after this draft began. Your recovered text is preserved, but Save cannot overwrite the newer version. Keep any text you need before reloading published content.");
      }
    }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load content."); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => { mounted.current = false; controller.abort(); window.removeEventListener(SITE_CONTENT_DRAFT_CLEAR_EVENT, stop); };
  }, []);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  function clearStoredDraft() {
    try { clearSiteContentDraft(window.sessionStorage); } catch { /* Storage may be disabled. */ }
    setDraftSaved(false);
  }
  function changeDraft(next: ContentValues) {
    if (!snapshot || stopDraft.current) return;
    setDraft(next); setStatus("");
    if (JSON.stringify(next) === JSON.stringify(snapshot.overrides)) { clearStoredDraft(); setBaseRevision(snapshot.revision); return; }
    try { setDraftSaved(saveSiteContentDraft(window.sessionStorage, { version: 1, baseRevision, overrides: next })); }
    catch { setDraftSaved(false); }
  }
  async function save() {
    if (!snapshot) return; setBusy(true); setError(""); setStatus("");
    try {
      const response = await fetch("/api/admin/site-content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: baseRevision, overrides: draft }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save content.");
      if (!mounted.current || stopDraft.current) return;
      clearStoredDraft(); setBaseRevision(data.revision); setSnapshot({ ...snapshot, revision: data.revision, overrides: { ...draft } }); setStatus("Published. Public pages show these changes on their next load.");
      router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save content."); }
    finally { setBusy(false); }
  }
  const defaults = snapshot?.defaults ?? defaultContentValues;
  const shown = contentFields.filter(field => (!field.lang || field.lang === language) && (search ? `${field.group} ${field.label} ${String(draft[field.key] ?? defaults[field.key])}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()) : field.group === group));
  return <section className="space-y-6" aria-labelledby="site-content-editor-title">
    <div><h2 id="site-content-editor-title" className="text-2xl font-semibold">Site content</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">Edit public wording in both languages, public links and optional sections. Changes publish together when you save. Passwords, credentials, HTML and application code are managed separately.</p></div>
    <div className="sticky top-20 z-20 flex flex-wrap gap-3 items-center rounded-xl border border-white/10 bg-[color:var(--color-bg)]/95 p-3 backdrop-blur-xl">
      <button type="button" className="btn-primary text-sm" disabled={!snapshot || !dirty || busy} onClick={() => void save()}>{busy ? "Working…" : "Save changes"}</button>
      <button type="button" className="btn-ghost text-sm" disabled={!dirty || busy} onClick={() => { clearStoredDraft(); setDraft({ ...snapshot!.overrides }); setBaseRevision(snapshot!.revision); setError(""); setStatus("Draft discarded."); }}>Discard changes</button>
      <button type="button" className="btn-ghost text-sm" disabled={busy} onClick={() => { if (!dirty || confirm("Discard your unsaved changes and reload the published content?")) void load(); }}>Reload published</button>
      <span className="text-xs text-[color:var(--color-fg-muted)]">{dirty ? draftSaved ? "Unpublished · draft saved in this tab" : "Unpublished · tab recovery unavailable" : snapshot ? "Up to date" : "Not loaded"}</span>
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-400/30 p-4 text-sm text-red-200">{error}</p>}
    {status && <p role="status" className="text-sm text-[color:var(--color-accent-2)]">{status}</p>}
    {snapshot && <>
      <div className="grid sm:grid-cols-3 gap-4">
        <label className="text-sm">Language<select className="input mt-2" value={language} onChange={event => setLanguage(event.target.value as "en" | "sl")}><option value="en">English</option><option value="sl">Slovenščina</option></select></label>
        <label className="text-sm">Section<select className="input mt-2" value={group} onChange={event => { setGroup(event.target.value); setSearch(""); }}>{groups.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="text-sm">Search public content<input className="input mt-2" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a label, paragraph or link" /></label>
      </div>
      <p className="text-xs text-[color:var(--color-fg-muted)]">Public profile and visibility settings are shared across languages. Text fields are plain text. Empty optional links hide their associated link.</p>
      <fieldset disabled={busy} className="space-y-5"><legend className="sr-only">Editable content fields</legend>
        {shown.map(field => { const value = draft[field.key] ?? defaults[field.key]; const changed = Object.hasOwn(draft, field.key); const id = `content-${field.key}`; return <div key={field.key} className="surface-panel rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-2"><label htmlFor={id} className="text-sm font-medium">{field.label}<span className="block mt-1 text-xs font-normal text-[color:var(--color-fg-muted)]">{field.group}{field.lang ? ` · ${field.lang.toUpperCase()}` : " · shared"}</span></label>{changed && <button type="button" className="text-xs underline underline-offset-4 shrink-0" onClick={() => { const next = { ...draft }; delete next[field.key]; changeDraft(next); }}>Use default</button>}</div>
          {field.type === "boolean" ? <label className="inline-flex gap-3 items-center text-sm"><input id={id} type="checkbox" checked={value === true} onChange={event => changeDraft({ ...draft, [field.key]: event.target.checked })} />Show this section</label> : (String(field.defaultValue).length > 100 || String(field.defaultValue).includes("\n")) && field.type === "text" ? <textarea id={id} className="input min-h-24" rows={3} maxLength={field.maxLength} required={!field.optional} value={String(value)} onChange={event => changeDraft({ ...draft, [field.key]: event.target.value })} /> : <input id={id} className="input" type={field.type === "url" ? "url" : field.type === "email" ? "email" : "text"} maxLength={field.maxLength} required={!field.optional} value={String(value)} onChange={event => changeDraft({ ...draft, [field.key]: event.target.value })} />}
        </div>; })}
        {shown.length === 0 && <p className="text-sm text-[color:var(--color-fg-muted)]">No matching fields. Try another search.</p>}
      </fieldset>
    </>}
  </section>;
}
