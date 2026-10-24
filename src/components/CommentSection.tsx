"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Send, User, CheckCircle2, AlertCircle } from "lucide-react";
import { translations, type Lang } from "@/lib/i18n";
import { Reveal } from "@/components/Reveal";
import { formatDate } from "@/lib/utils";

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
};

export function CommentSection({ slug, initialComments, lang }: Props) {
  const t = translations[lang].projects;
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [author, setAuthor] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<null | "ok" | "error">(null);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${slug}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ author, email, content }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = (await res.json()) as { comment: Comment };
        setComments((c) => [data.comment, ...c]);
        setAuthor("");
        setEmail("");
        setContent("");
        setStatus("ok");
      } catch {
        setStatus("error");
      }
    });
  };

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
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              required
              maxLength={100}
              placeholder={t.commentName}
              className="input"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              maxLength={200}
              placeholder={t.commentEmail}
              className="input"
            />
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            maxLength={2000}
            placeholder={t.commentBody}
            className="textarea"
          />
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button type="submit" disabled={isPending} className="btn-primary">
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
          </div>
        </form>
      </Reveal>

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
            —
          </li>
        )}
      </ul>
    </section>
  );
}
