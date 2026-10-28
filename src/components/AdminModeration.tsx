"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Ban, CheckCircle2, MapPin, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { AdminBlock, SubmissionModeration } from "@/lib/moderation-types";
import type { AdminMessage } from "@/components/AdminDashboard";

type AdminComment = {
  id: number; projectId: number; projectTitle: string; projectSlug: string;
  author: string; email: string | null; content: string; approved: boolean; createdAt: string;
  moderation: SubmissionModeration | null;
};
type CommentFilter = "public" | "removed" | "all";
type MessageWithModeration = AdminMessage & { moderation?: SubmissionModeration | null };
const privateFetch = { cache: "no-store", credentials: "same-origin" } as const;
const blockCaveat = "Address blocks apply to future comments and contact messages. Shared networks or VPNs can affect other people, and addresses can change. An address ID does not identify a person.";

function Feedback({ error, notice }: { error?: string; notice?: string }) {
  return <>{error && <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-rose-300/20 p-4 text-sm text-rose-200"><AlertCircle className="shrink-0" size={16} />{error}</p>}{notice && <p role="status" className="mb-4 flex items-start gap-2 text-sm text-emerald-200"><CheckCircle2 className="shrink-0" size={16} />{notice}</p>}</>;
}

/** This component is used only inside the authenticated dashboard. */
function SubmissionDetails({ moderation, onBlockChange, disabled = false }: { moderation: SubmissionModeration | null | undefined; onBlockChange(fingerprint: string, blocked: boolean): void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function toggleBlock() {
    if (!moderation || busy || disabled) return;
    const blocked = !moderation.blocked;
    if (blocked && !confirm("Block this address from future comments and contact messages? People sharing this network address may also be affected.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/moderation", { ...privateFetch, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fingerprint: moderation.fingerprint, blocked, reason: blocked ? "Blocked by site admin" : "" }) });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || "Could not update address block.");
      onBlockChange(moderation.fingerprint, blocked);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not update address block."); }
    finally { setBusy(false); }
  }
  if (!moderation) return <p className="mt-4 border-t border-white/10 pt-3 text-xs text-[color:var(--color-fg-muted)]">Address ID and approximate location: unavailable for older submissions or requests without this information.</p>;
  return <div className="mt-4 border-t border-white/10 pt-3 text-xs text-[color:var(--color-fg-muted)]">
    <dl className="grid gap-2 sm:grid-cols-2"><div><dt className="font-medium">Address ID</dt><dd className="mt-1 break-all font-mono">{moderation.fingerprint.slice(0, 16)}…{moderation.blocked && <span className="ml-2 font-sans text-rose-200">Blocked</span>}</dd></div><div><dt className="flex items-center gap-1 font-medium"><MapPin size={12} />Country / Region / City (approximate)</dt><dd className="mt-1">{[moderation.country, moderation.region, moderation.city].filter(Boolean).join(" / ") || "Unavailable"}</dd></div></dl>
    <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" disabled={busy || disabled} className="btn-ghost text-xs" onClick={() => void toggleBlock()}><Ban size={13} />{busy ? "Updating…" : moderation.blocked ? "Unblock address" : "Block address"}</button><span>Private · visible only to the site admin</span></div>
    {error && <p role="alert" className="mt-2 text-rose-200">{error}</p>}
  </div>;
}

export function AdminComments() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [filter, setFilter] = useState<CommentFilter>("public");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState<Record<number, boolean>>({});
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/admin/comments?page=${page}&status=${filter}`, { ...privateFetch, signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load comments.");
      if (controller.signal.aborted) return;
      setComments(result.comments); setHasMore(result.hasMore === true);
    }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load comments."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, filter, refresh]);
  const reload = () => { setLoading(true); setError(""); setRefresh(value => value + 1); };
  const blockChanged = (fingerprint: string, blocked: boolean) => setComments(current => current.map(comment => comment.moderation?.fingerprint === fingerprint ? { ...comment, moderation: { ...comment.moderation, blocked } } : comment));
  async function changeVisibility(comment: AdminComment, approved: boolean, retrying = false) {
    if (loading || busyId !== null) return;
    if (!approved && !retrying && !confirm("Remove this comment from public view? You can restore it from Removed comments.")) return;
    setBusyId(comment.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/comments/${comment.id}`, { ...privateFetch, method: approved ? "PATCH" : "DELETE", ...(approved ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approved: true }) } : {}) });
      const result = await response.json();
      if (result.persisted === true || response.ok) setComments(current => current.map(row => row.id === comment.id ? { ...row, approved } : row));
      if (!response.ok || result.ok !== true) {
        if (result.persisted === true) setRetry(current => ({ ...current, [comment.id]: approved }));
        throw new Error(result.error || "Could not update comment visibility.");
      }
      setRetry(current => { const next = { ...current }; delete next[comment.id]; return next; });
      setNotice(approved ? "Comment restored to public view." : "Comment removed from public view. You can restore it from Removed comments.");
      reload();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not update comment visibility."); }
    finally { setBusyId(null); }
  }
  return <section aria-labelledby="admin-comments-title">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 id="admin-comments-title" className="text-xl font-semibold">Comments</h2><button type="button" disabled={loading || busyId !== null} className="btn-ghost text-sm" onClick={reload}><RefreshCw size={14} />Refresh</button></div>
    <p className="mb-4 max-w-3xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">Remove comments from public view or restore them later. Location and address details below are private. {blockCaveat}</p>
    <label className="mb-5 block max-w-xs text-sm">Show comments<select className="input mt-2" value={filter} disabled={busyId !== null} onChange={event => { setLoading(true); setError(""); setNotice(""); setPage(1); setFilter(event.target.value as CommentFilter); }}><option value="public">Public comments</option><option value="removed">Removed comments</option><option value="all">All comments</option></select></label>
    <Feedback error={error} notice={notice} />
    {loading ? <p role="status" className="py-6 text-sm text-[color:var(--color-fg-muted)]">Loading comments…</p> : comments.length === 0 ? <p className="rounded-xl border border-white/10 p-6 text-sm text-[color:var(--color-fg-muted)]">{error ? "Comments could not be loaded." : filter === "removed" ? "No removed comments." : "No comments in this view."}</p> : <ul className="space-y-4">{comments.map(comment => <li key={comment.id} className="min-w-0 rounded-xl border border-white/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="[overflow-wrap:anywhere] font-medium">{comment.author}</h3><p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">{formatDate(comment.createdAt, "en")} · {comment.approved ? "Public" : "Removed"}</p></div><button type="button" disabled={busyId !== null} className="btn-ghost text-sm" onClick={() => void changeVisibility(comment, !comment.approved)}>{comment.approved ? <Trash2 size={14} /> : <RotateCcw size={14} />}{busyId === comment.id ? "Updating…" : comment.approved ? "Remove comment" : "Restore comment"}</button></div>
      <a className="mt-3 inline-block [overflow-wrap:anywhere] text-sm text-[color:var(--color-accent-2)] underline" href={`/projects/${encodeURIComponent(comment.projectSlug)}`}>{comment.projectTitle}</a>
      {comment.email && <p className="mt-1 break-all text-xs text-[color:var(--color-fg-muted)]">Email (private): {comment.email}</p>}
      <p className="mt-3 whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-relaxed">{comment.content}</p>
      {Object.hasOwn(retry, comment.id) && <button type="button" disabled={busyId !== null} className="btn-ghost mt-3 text-xs" onClick={() => void changeVisibility(comment, retry[comment.id], true)}>Retry public cache refresh</button>}
      <SubmissionDetails moderation={comment.moderation} onBlockChange={blockChanged} disabled={busyId !== null} />
    </li>)}</ul>}
    <div className="mt-5 flex items-center gap-3"><button type="button" className="btn-ghost text-sm" disabled={loading || busyId !== null || page <= 1} onClick={() => { setLoading(true); setError(""); setPage(value => value - 1); }}>Previous page</button><span className="text-xs text-[color:var(--color-fg-muted)]">Page {page}</span><button type="button" className="btn-ghost text-sm" disabled={loading || busyId !== null || !hasMore} onClick={() => { setLoading(true); setError(""); setPage(value => value + 1); }}>Next page</button></div>
  </section>;
}

export function AdminBlocks() {
  const [blocks, setBlocks] = useState<AdminBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/moderation", { ...privateFetch, signal: controller.signal }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not load blocked addresses."); if (!controller.signal.aborted) setBlocks(result.blocks); }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load blocked addresses."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);
  async function unblock(block: AdminBlock) {
    if (busy) return; setBusy(block.fingerprint); setError(""); setNotice("");
    try { const response = await fetch("/api/admin/moderation", { ...privateFetch, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fingerprint: block.fingerprint, blocked: false }) }); const result = await response.json(); if (!response.ok || result.ok !== true) throw new Error(result.error || "Could not unblock address."); setBlocks(result.blocks); setNotice("Address unblocked."); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not unblock address."); }
    finally { setBusy(""); }
  }
  return <section aria-labelledby="admin-blocks-title"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 id="admin-blocks-title" className="text-xl font-semibold">Blocked addresses</h2><button type="button" disabled={loading || Boolean(busy)} className="btn-ghost text-sm" onClick={() => { setLoading(true); setError(""); setRefresh(value => value + 1); }}><RefreshCw size={14} />Refresh</button></div><p className="mb-5 max-w-3xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">{blockCaveat}</p><Feedback error={error} notice={notice} />{loading ? <p role="status" className="py-6 text-sm text-[color:var(--color-fg-muted)]">Loading blocked addresses…</p> : blocks.length === 0 ? <p className="rounded-xl border border-white/10 p-6 text-sm text-[color:var(--color-fg-muted)]">{error ? "Blocked addresses could not be loaded." : "No blocked addresses."}</p> : <ul className="space-y-3">{blocks.map(block => <li key={block.fingerprint} className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 p-5"><div className="min-w-0"><p className="break-all font-mono text-sm">{block.fingerprint.slice(0, 16)}…</p><p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">Blocked {formatDate(block.createdAt, "en")}</p>{block.reason && <p className="mt-2 [overflow-wrap:anywhere] text-sm">{block.reason}</p>}</div><button type="button" className="btn-ghost text-sm" disabled={Boolean(busy)} onClick={() => void unblock(block)}>{busy === block.fingerprint ? "Updating…" : "Unblock address"}</button></li>)}</ul>}</section>;
}

export function AdminMessages({ initialMessages, loadError }: { initialMessages: AdminMessage[]; loadError?: string }) {
  const [messages, setMessages] = useState<MessageWithModeration[]>(initialMessages.slice(0, 40));
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/admin/messages?page=${page}`, { ...privateFetch, signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load messages.");
      if (!controller.signal.aborted) { setMessages(result.messages); setHasMore(result.hasMore === true); }
    }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load messages."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, refresh]);
  const blockChanged = (fingerprint: string, blocked: boolean) => setMessages(current => current.map(message => message.moderation?.fingerprint === fingerprint ? { ...message, moderation: { ...message.moderation, blocked } } : message));
  return <section aria-labelledby="admin-messages-title"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 id="admin-messages-title" className="text-xl font-semibold">Contact messages</h2><button type="button" disabled={loading} className="btn-ghost text-sm" onClick={() => { setLoading(true); setError(""); setRefresh(value => value + 1); }}><RefreshCw size={14} />Refresh</button></div><p className="mb-5 max-w-3xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">Sender address IDs and approximate locations are private. {blockCaveat}</p><Feedback error={error} />{loading && <p role="status" className="mb-4 text-xs text-[color:var(--color-fg-muted)]">Loading private sender details…</p>}{messages.length === 0 ? <p className="rounded-xl border border-white/10 p-6 text-sm text-[color:var(--color-fg-muted)]">{error || loadError ? "Messages are unavailable until the database reconnects." : loading ? "Loading messages…" : "No messages yet."}</p> : <ul className="space-y-3">{messages.map(message => <li key={message.id} className="min-w-0 rounded-xl border border-white/10 p-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="[overflow-wrap:anywhere] font-medium">{message.name}</h3><span className="text-xs text-[color:var(--color-fg-muted)]">{formatDate(message.createdAt, "en")}</span></div><a href={`mailto:${message.email}`} className="break-all text-sm text-[color:var(--color-accent-2)] underline">{message.email}</a>{message.subject && <p className="mt-2 [overflow-wrap:anywhere] text-sm font-medium">{message.subject}</p>}<p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere] text-sm text-[color:var(--color-fg-muted)]">{message.message}</p><SubmissionDetails moderation={message.moderation} onBlockChange={blockChanged} disabled={loading} /></li>)}</ul>}
    <div className="mt-5 flex items-center gap-3">
      <button type="button" className="btn-ghost text-sm" disabled={loading || page <= 1} onClick={() => { setLoading(true); setError(""); setMessages([]); setPage(value => value - 1); }}>Previous page</button>
      <span className="text-xs text-[color:var(--color-fg-muted)]">Page {page}</span>
      <button type="button" className="btn-ghost text-sm" disabled={loading || !hasMore} onClick={() => { setLoading(true); setError(""); setMessages([]); setPage(value => value + 1); }}>Next page</button>
    </div>
  </section>;
}
