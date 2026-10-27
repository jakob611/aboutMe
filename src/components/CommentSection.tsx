"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Send, User, CheckCircle2, AlertCircle } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { useSiteContent } from "@/components/SiteContentProvider";
import { Reveal } from "@/components/Reveal";
import { formatDate } from "@/lib/utils";
import { ContactTurnstile } from "@/components/ContactTurnstile";
import { submissionCopy } from "@/lib/submission-copy";

type Comment = {
  id: number;
  author: string;
  content: string;
  createdAt: string | Date;
};

type Props = {
  slug: string;
  initialComments: Comment[];
  lang: Lang;
  verificationSiteKey?: string;
};

export function CommentSection({ slug, initialComments, lang, verificationSiteKey }: Props) {
  const siteContent = useSiteContent();
  const t = siteContent.translation(lang).projects;
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [author, setAuthor] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<null | "ok" | "error" | "verification">(null);
  const [refreshDelayed, setRefreshDelayed] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [verificationState, setVerificationState] = useState<"pending" | "expired" | "error">("pending");
  const [verificationReset, setVerificationReset] = useState(0);
  const copy = (key: string) => siteContent.text(lang, key, submissionCopy[lang][key]);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationSiteKey || !verificationToken) { setStatus("verification"); return; }
    setStatus(null);
    setRefreshDelayed(false);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${slug}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ author, email, content, "cf-turnstile-response": verificationToken }),
        });
        if (!res.ok) { setStatus(res.status === 403 ? "verification" : "error"); return; }
        const data = (await res.json()) as { comment: Comment; cacheRefreshed?: boolean };
        setComments((c) => [data.comment, ...c].slice(0, 200));
        setRefreshDelayed(data.cacheRefreshed === false);
        setAuthor("");
        setEmail("");
        setContent("");
        setStatus("ok");
      } catch {
        setStatus("error");
      } finally {
        setVerificationToken("");
        setVerificationState("pending");
        setVerificationReset(value => value + 1);
      }
    });
  };

  if (!siteContent.section("projects.comments")) return null;
  return (
    <section>
      <Reveal>
        <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <MessageSquare size={22} />
          {t.commentsTitle}
          <span className="ml-2 text-sm font-normal text-[color:var(--color-fg-muted)]">
            ({comments.length})
          </span>
        </h2>
      </Reveal>

      <Reveal delay={0.05}>
        <form
          onSubmit={submit}
          className="mt-6 glass rounded-2xl p-5 sm:p-6 space-y-3"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              aria-label={t.commentName}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              required
              maxLength={100}
              placeholder={t.commentName}
              className="input"
            />
            <input
              aria-label={t.commentEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              maxLength={200}
              placeholder={t.commentEmail}
              className="input"
            />
          </div>
          <textarea
            aria-label={t.commentBody}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            maxLength={2000}
            placeholder={t.commentBody}
            className="textarea"
          />
          {verificationSiteKey ? <div className="space-y-2">
            <ContactTurnstile siteKey={verificationSiteKey} action="comment" lang={lang} label={copy("comments.verification.label")} resetKey={verificationReset}
              onToken={token => { setVerificationToken(token); if (token) setVerificationState("pending"); }}
              onError={() => setVerificationState("error")} onExpired={() => setVerificationState("expired")} />
            <p role="status" aria-live="polite" className="text-xs text-[color:var(--color-fg-muted)]">{copy(`comments.verification.${verificationToken ? "complete" : verificationState}`)}</p>
          </div> : <p className="text-sm text-[color:var(--color-fg-muted)]">{copy("comments.unavailable")}</p>}
          <p className="text-xs leading-relaxed text-[color:var(--color-fg-muted)]">{copy("submission.privacy")}</p>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button type="submit" disabled={isPending || !verificationSiteKey || !verificationToken} className="btn-primary">
              {isPending ? (
                t.commentPosting
              ) : (
                <>
                  {t.commentSubmit} <Send size={14} />
                </>
              )}
            </button>
            {status === "ok" && (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
                <CheckCircle2 size={15} /> {t.commentSuccess}
              </span>
            )}
            {status === "error" && (
              <span className="inline-flex items-center gap-1.5 text-sm text-rose-300">
                <AlertCircle size={15} /> {t.commentError}
              </span>
            )}
            {status === "verification" && <span role="alert" className="inline-flex items-center gap-1.5 text-sm text-rose-300"><AlertCircle size={15} />{copy("comments.verification.required")}</span>}
          </div>
        </form>
        {refreshDelayed && <p role="status" className="mt-3 text-sm text-[color:var(--color-fg-muted)]">{copy("comments.refreshDelay")}</p>}
      </Reveal>

      {comments.length >= 200 && <p className="mt-6 text-xs text-[color:var(--color-fg-muted)]">{copy("comments.latest")}</p>}

      <ul className="mt-8 space-y-4">
        {comments.map((c, i) => (
          <Reveal key={c.id} delay={Math.min(i * 0.03, 0.2)}>
            <li className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] flex items-center justify-center text-sm font-bold">
                  <User size={16} />
                </div>
                <div>
                  <div className="font-medium">{c.author}</div>
                  <div className="text-xs text-[color:var(--color-fg-muted)]">
                    {formatDate(c.createdAt, lang)}
                  </div>
                </div>
              </div>
              <p className="text-[color:var(--color-fg-muted)] whitespace-pre-wrap leading-relaxed">
                {c.content}
              </p>
            </li>
          </Reveal>
        ))}
        {comments.length === 0 && (
          <li className="text-center text-[color:var(--color-fg-muted)] py-10">
            {siteContent.text(lang, "projects.noComments")}
          </li>
        )}
      </ul>
    </section>
  );
}
