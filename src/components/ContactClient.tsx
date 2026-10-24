"use client";

import { useState, useTransition } from "react";
import { Send, Mail, MapPin, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import type { Translation, Lang } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

type Props = { lang: Lang; t: Translation };

export function ContactClient({ lang, t }: Props) {
  const c = t.contact;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<null | "ok" | "err">(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, subject, message }),
        });
        if (!res.ok) throw new Error("Failed");
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

  return (
    <div className="mt-12 grid lg:grid-cols-12 gap-8">
      <Reveal>
        <form
          onSubmit={submit}
          className="lg:col-span-7 glass rounded-3xl p-6 sm:p-8 space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-[color:var(--color-fg-muted)] mb-1 block">
                {c.name} *
              </span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            </label>
            <label className="block">
              <span className="text-sm text-[color:var(--color-fg-muted)] mb-1 block">
                {c.email} *
              </span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm text-[color:var(--color-fg-muted)] mb-1 block">
              {c.subject}
            </span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="text-sm text-[color:var(--color-fg-muted)] mb-1 block">
              {c.message} *
            </span>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="textarea"
            />
          </label>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> {c.sending}
                </>
              ) : (
                <>
                  {c.send} <Send size={14} />
                </>
              )}
            </button>
            {status === "ok" && (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
                <CheckCircle2 size={15} /> {c.success}
              </span>
            )}
            {status === "err" && (
              <span className="inline-flex items-center gap-1.5 text-sm text-rose-300">
                <AlertCircle size={15} /> {c.error}
              </span>
            )}
          </div>
        </form>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="lg:col-span-5 space-y-4">
          <div className="glass rounded-3xl p-6">
            <Mail size={22} className="text-[#22d3ee] mb-3" />
            <div className="text-sm text-[color:var(--color-fg-muted)] mb-1">
              Email
            </div>
            <a
              href={`mailto:${siteConfig.email}`}
              className="font-semibold hover:text-white break-all"
            >
              {siteConfig.email}
            </a>
          </div>
          <div className="glass rounded-3xl p-6">
            <MapPin size={22} className="text-[#f472b6] mb-3" />
            <div className="text-sm text-[color:var(--color-fg-muted)] mb-1">
              {lang === "sl" ? "Lokacija" : "Based in"}
            </div>
            <div className="font-semibold">
              {lang === "sl" ? "Slovenija 🇸🇮" : "Slovenia 🇸🇮"}
            </div>
          </div>
          <div className="glass rounded-3xl p-6 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
            {lang === "sl"
              ? "Za povpraševanja o storitvah prosim navedi kratek opis projekta, rok in proračun. Odgovorim v 24 urah."
              : "For service inquiries please include a short project description, timeline and budget. I reply within 24 hours."}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
