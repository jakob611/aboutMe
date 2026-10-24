"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  ArrowUpRight,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import type { Translation, Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  t: Translation;
  contactEmail?: string;
  githubUrl?: string;
  initialSubject?: string;
};

export function ContactClient({
  lang,
  t,
  contactEmail = "",
  githubUrl = "",
  initialSubject = "",
}: Props) {
  const c = t.contact;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<
    null | "ok" | "err" | "limit" | "required"
  >(null);
  const [pending, startTransition] = useTransition();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus("required");
      return;
    }
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            message: message.trim(),
          }),
        });
        if (!res.ok) {
          setStatus(res.status === 429 ? "limit" : "err");
          return;
        }
        setStatus("ok");
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      } catch {
        setStatus("err");
      }
    });
  };
  const prompts =
    lang === "sl"
      ? [
          {
            title: "Kaj želiš narediti?",
            body: "Nova ideja, obstoječ projekt ali nekaj, kar bi moralo delovati bolje.",
          },
          {
            title: "Kaj je že znano?",
            body: "Platforma, okviren obseg in morebitni rok. Tudi če je načrt še odprt.",
          },
          {
            title: "Imaš kaj za pokazati?",
            body: "Povezava, posnetek zaslona ali skica pomaga pojasniti zamisel.",
          },
        ]
      : [
          {
            title: "What are you making?",
            body: "A new idea, an existing project, or something that should work better.",
          },
          {
            title: "What do you know so far?",
            body: "The platform, a rough scope, and any timing constraints. An unfinished plan is fine.",
          },
          {
            title: "Anything I should see?",
            body: "A link, screenshot, or sketch can help explain what you have in mind.",
          },
        ];
  const feedback =
    status === "required"
      ? lang === "sl"
        ? "Dodaj svoje ime, e-pošto in kratko sporočilo."
        : "Add your name, email, and a short message."
      : status === "limit"
        ? lang === "sl"
          ? "Poslanih je bilo preveč sporočil. Poskusi znova malo pozneje."
          : "Too many messages were sent. Please try again a little later."
        : c.error;

  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-16">
      <Reveal className="lg:col-span-7">
        <form
          onSubmit={submit}
          aria-busy={pending}
          className="surface-panel rounded-2xl p-5 sm:p-8"
        >
          <fieldset disabled={pending} className="min-w-0 space-y-6">
            <legend className="sr-only">{c.title}</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm">
                  {c.name}
                  <span
                    aria-hidden="true"
                    className="ml-1 text-[color:var(--color-accent-2)]"
                  >
                    *
                  </span>
                </span>
                <input
                  required
                  autoComplete="name"
                  name="name"
                  maxLength={120}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="input"
                  placeholder={lang === "sl" ? "Tvoje ime" : "Your name"}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm">
                  {c.email}
                  <span
                    aria-hidden="true"
                    className="ml-1 text-[color:var(--color-accent-2)]"
                  >
                    *
                  </span>
                </span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  name="email"
                  maxLength={200}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input"
                  placeholder="you@domain.com"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm">
                {c.subject}
                <span className="ml-2 text-xs text-[color:var(--color-fg-muted)]">
                  {lang === "sl" ? "neobvezno" : "optional"}
                </span>
              </span>
              <input
                name="subject"
                maxLength={200}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="input"
                placeholder={
                  lang === "sl" ? "Za kaj gre?" : "What’s this about?"
                }
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm">
                {c.message}
                <span
                  aria-hidden="true"
                  className="ml-1 text-[color:var(--color-accent-2)]"
                >
                  *
                </span>
              </span>
              <textarea
                required
                name="message"
                rows={7}
                maxLength={10000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="textarea"
                placeholder={
                  lang === "sl"
                    ? "Opiši zamisel po svoje. Ni treba, da je vse že določeno."
                    : "Tell me about it in your own words. You don’t need to have everything figured out."
                }
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
              <p className="max-w-xs text-xs leading-relaxed text-[color:var(--color-fg-muted)]">
                {lang === "sl"
                  ? "E-poštni naslov mi omogoča, da ti odgovorim."
                  : "Your email gives me a way to reply."}
              </p>
              <button
                type="submit"
                disabled={pending}
                className="btn-primary disabled:cursor-wait disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <Loader2
                      aria-hidden="true"
                      size={15}
                      className="animate-spin"
                    />
                    {c.sending}
                  </>
                ) : (
                  <>
                    {c.send}
                    <ArrowUpRight aria-hidden="true" size={16} />
                  </>
                )}
              </button>
            </div>
          </fieldset>
          {status === "ok" && (
            <div
              role="status"
              aria-live="polite"
              className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] p-4 text-sm text-emerald-200"
            >
              <CheckCircle2
                aria-hidden="true"
                size={17}
                className="mt-0.5 shrink-0"
              />
              {c.success}
            </div>
          )}
          {status !== null && status !== "ok" && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-xl border border-rose-300/20 bg-rose-300/[0.05] p-4 text-sm text-rose-200"
            >
              <AlertCircle
                aria-hidden="true"
                size={17}
                className="mt-0.5 shrink-0"
              />
              <span>
                {feedback}{" "}
                {status === "err" &&
                  (lang === "sl"
                    ? "Vsebina sporočila ostane v obrazcu."
                    : "Your draft is still in the form.")}
              </span>
            </div>
          )}
        </form>
      </Reveal>
      <Reveal delay={0.12} className="lg:col-span-5">
        <aside className="lg:pt-2">
          <h2 className="section-label">
            {lang === "sl" ? "Dober začetek" : "A useful starting point"}
          </h2>
          <ol className="mt-6">
            {prompts.map((prompt, index) => (
              <li
                key={prompt.title}
                className="flex gap-4 border-t border-white/10 py-5"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 font-mono text-xs text-[color:var(--color-accent-2)]"
                >
                  0{index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-medium">{prompt.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                    {prompt.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {(contactEmail || githubUrl) && (
            <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="group flex items-center gap-3 text-sm"
                >
                  <Mail
                    aria-hidden="true"
                    size={16}
                    className="shrink-0 text-[color:var(--color-fg-muted)]"
                  />
                  <span className="break-all">{contactEmail}</span>
                  <ArrowUpRight
                    aria-hidden="true"
                    size={14}
                    className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </a>
              )}
              {githubUrl && (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-[color:var(--color-fg-muted)] transition-colors hover:text-[color:var(--color-fg)]"
                >
                  {lang === "sl"
                    ? "Moja koda na GitHubu"
                    : "Find my code on GitHub"}
                  <ArrowUpRight aria-hidden="true" size={13} />
                  <span className="sr-only">
                    {lang === "sl"
                      ? "Odpre se v novem zavihku"
                      : "Opens in a new tab"}
                  </span>
                </a>
              )}
            </div>
          )}
        </aside>
      </Reveal>
    </div>
  );
}
