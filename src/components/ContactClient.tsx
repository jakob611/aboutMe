"use client";
import { SiteSection } from "@/components/SiteContentProvider";
import { useSiteContent } from "@/components/SiteContentProvider";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import {
  ArrowUpRight,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import type { Translation, Lang } from "@/lib/i18n";
import { LANGUAGE_CHANGE_EVENT, saveContactDraft, takeContactDraft } from "@/lib/contact-draft";
import { emptyInquiry, findInquiryCategory, inquiryCategories, inquiryFromQuery, inquirySubject, needsCustomSubject, validInquiry, type InquirySelection } from "@/lib/inquiry-topics";
import { submitContact, type ContactDelivery } from "@/lib/contact-delivery";
import { ContactTurnstile } from "@/components/ContactTurnstile";
import { contactVerificationCopy } from "@/lib/contact-verification-copy";
import { submissionCopy } from "@/lib/submission-copy";

type Props = {
  lang: Lang;
  t: Translation;
  contactEmail?: string;
  githubUrl?: string;
  initialInquiry?: InquirySelection;
  delivery: ContactDelivery;
  verificationSiteKey?: string;
};

export function ContactClient({
  lang,
  t,
  contactEmail = "",
  githubUrl = "",
  initialInquiry = emptyInquiry,
  delivery,
  verificationSiteKey,
}: Props) {
  const content = useSiteContent();
  const c = t.contact;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inquiry, setInquiry] = useState(initialInquiry);
  const [website, setWebsite] = useState("");
  const subject = inquirySubject(inquiry, lang);
  const selectedCategory = findInquiryCategory(inquiry.category);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<
    null | "ok" | "err" | "limit" | "required" | "verification"
  >(null);
  const [verificationToken, setVerificationToken] = useState("");
  const [verificationState, setVerificationState] = useState<"pending" | "expired" | "error">("pending");
  const [verificationReset, setVerificationReset] = useState(0);
  const verificationText = (key: string) => content.text(lang, `contact.verification.${key}`, contactVerificationCopy[lang][`contact.verification.${key}`]);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    let draft;
    try {
      draft = takeContactDraft(window.sessionStorage, window.location.href);
    } catch {
      return;
    }
    if (!draft) return;
    // Synchronize the one-use browser handoff after hydration, keeping SSR stable.
    startTransition(() => {
      setName(draft.name);
      setEmail(draft.email);
      setInquiry(draft.category === undefined ? inquiryFromQuery({ subject: draft.subject }) : {
        category: findInquiryCategory(draft.category)?.id ?? "",
        topic: draft.topic ?? "",
        customSubject: draft.customSubject ?? "",
      });
      setMessage(draft.message);
    });
  }, []);

  useEffect(() => {
    const preserveForLanguageChange = () => {
      try {
        saveContactDraft(window.sessionStorage, window.location.href, { name, email, subject, message, ...inquiry });
      } catch {
        // Accessing sessionStorage itself may be blocked by browser policy.
      }
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, preserveForLanguageChange);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, preserveForLanguageChange);
  }, [name, email, subject, message, inquiry]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim() || !validInquiry(inquiry)) {
      setStatus("required");
      return;
    }
    if (delivery.mode === "unavailable") return;
    if (delivery.mode === "inbox" && (!verificationSiteKey || !verificationToken)) {
      setStatus("verification");
      return;
    }
    setStatus(null);
    startTransition(async () => {
      try {
        const payload = {
          name: name.trim(), email: email.trim(), subject, message: message.trim(),
          category: inquiry.category, topic: inquiry.topic, customSubject: inquiry.customSubject.trim(), website,
          ...(delivery.mode === "inbox" ? { "cf-turnstile-response": verificationToken } : {}),
        };
        const result = await submitContact(delivery, payload);
        if (result !== "ok") {
          setStatus(result === "limit" ? "limit" : result === "verification" ? "verification" : "err");
          return;
        }
        setStatus("ok");
        setName("");
        setEmail("");
        setInquiry({ ...emptyInquiry });
        setWebsite("");
        setMessage("");
      } catch {
        setStatus("err");
      } finally {
        if (delivery.mode === "inbox") {
          setVerificationToken("");
          setVerificationState("pending");
          setVerificationReset(value => value + 1);
        }
      }
    });
  };
  const prompts =
    lang === "sl"
      ? [
          {
            title: content.text(lang, "copy.7.1"),
            body: content.text(lang, "copy.7.2"),
          },
          {
            title: content.text(lang, "copy.7.3"),
            body: content.text(lang, "copy.7.4"),
          },
          {
            title: content.text(lang, "copy.7.5"),
            body: content.text(lang, "copy.7.6"),
          },
        ]
      : [
          {
            title: content.text(lang, "copy.7.1"),
            body: content.text(lang, "copy.7.2"),
          },
          {
            title: content.text(lang, "copy.7.3"),
            body: content.text(lang, "copy.7.4"),
          },
          {
            title: content.text(lang, "copy.7.5"),
            body: content.text(lang, "copy.7.6"),
          },
        ];
  const feedback =
    status === "verification"
      ? verificationText("required")
      : status === "required"
      ? lang === "sl"
        ? content.text(lang, "copy.7.7")
        : content.text(lang, "copy.7.7")
      : status === "limit"
        ? lang === "sl"
          ? content.text(lang, "copy.7.8")
          : content.text(lang, "copy.7.8")
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
                  placeholder={lang === "sl" ? content.text(lang, "copy.7.9") : content.text(lang, "copy.7.9")}
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
                  placeholder={content.text(lang, "copy.7.10")}
                />
              </label>
            </div>
            <div className="hidden" aria-hidden="true">
              <label>{content.text(lang, "copy.7.11")}<input name="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" /></label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm">
                {c.subject} <span aria-hidden="true">*</span>
              </span>
              <select
                required
                name="category"
                value={inquiry.category}
                onChange={(event) => setInquiry({ category: findInquiryCategory(event.target.value)?.id ?? "", topic: "", customSubject: "" })}
                className="input select"
              >
                <option value="">{lang === "sl" ? content.text(lang, "copy.7.12") : content.text(lang, "copy.7.12")}</option>
                {inquiryCategories.map((category) => <option key={category.id} value={category.id}>{content.inquiryLabel(lang, category.id)}</option>)}
              </select>
            </label>
            {selectedCategory && inquiry.category !== "other" && <label className="block">
              <span className="mb-2 block text-sm">{lang === "sl" ? content.text(lang, "copy.7.13") : content.text(lang, "copy.7.13")} <span aria-hidden="true">*</span></span>
              <select required name="topic" value={inquiry.topic} onChange={(event) => setInquiry({ ...inquiry, topic: event.target.value, customSubject: "" })} className="input select">
                <option value="">{lang === "sl" ? content.text(lang, "copy.7.14") : content.text(lang, "copy.7.14")}</option>
                {selectedCategory.topics.map((topic) => <option key={topic.id} value={topic.id}>{content.inquiryLabel(lang, selectedCategory!.id, topic.id)}</option>)}
                <option value="other">{lang === "sl" ? content.text(lang, "copy.7.15") : content.text(lang, "copy.7.15")}</option>
              </select>
            </label>}
            </div>
            {needsCustomSubject(inquiry) && <label className="block">
              <span className="mb-2 block text-sm">{lang === "sl" ? content.text(lang, "copy.7.16") : content.text(lang, "copy.7.16")} <span aria-hidden="true">*</span></span>
              <input required name="customSubject" maxLength={160} value={inquiry.customSubject} onChange={(event) => setInquiry({ ...inquiry, customSubject: event.target.value })} className="input" placeholder={lang === "sl" ? content.text(lang, "copy.7.17") : content.text(lang, "copy.7.17")} />
            </label>}
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
                    ? content.text(lang, "copy.7.18")
                    : content.text(lang, "copy.7.18")
                }
              />
            </label>
            {verificationSiteKey && <div className="space-y-2">
              <ContactTurnstile
                siteKey={verificationSiteKey}
                lang={lang}
                label={verificationText("label")}
                resetKey={verificationReset}
                onToken={token => { setVerificationToken(token); if (token) setVerificationState("pending"); }}
                onError={() => setVerificationState("error")}
                onExpired={() => setVerificationState("expired")}
              />
              <p role="status" aria-live="polite" className="text-xs leading-relaxed text-[color:var(--color-fg-muted)]">{verificationToken ? verificationText("complete") : verificationText(verificationState)}</p>
            </div>}
            <p className="text-xs leading-relaxed text-[color:var(--color-fg-muted)]">{content.text(lang, "submission.privacy", submissionCopy[lang]["submission.privacy"])}</p>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
              <p className="max-w-xs text-xs leading-relaxed text-[color:var(--color-fg-muted)]">
                {delivery.mode === "unavailable" ? (lang === "sl" ? content.text(lang, "copy.7.19") : content.text(lang, "copy.7.19")) : delivery.mode === "email" ? (lang === "sl" ? content.text(lang, "copy.7.20") : content.text(lang, "copy.7.20")) : (lang === "sl" ? content.text(lang, "copy.7.21") : content.text(lang, "copy.7.21"))}
              </p>
              <button
                type="submit"
                disabled={pending || delivery.mode === "unavailable" || (delivery.mode === "inbox" && (!verificationSiteKey || !verificationToken))}
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
          {delivery.mode === "unavailable" && <p role="status" className="mt-5 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">{contactEmail
            ? lang === "sl" ? content.text(lang, "copy.7.22") : content.text(lang, "copy.7.22")
            : lang === "sl" ? content.text(lang, "copy.7.23") : content.text(lang, "copy.7.23")}</p>}
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
              {delivery.mode === "email" ? (lang === "sl" ? content.text(lang, "copy.7.24") : content.text(lang, "copy.7.24")) : (lang === "sl" ? content.text(lang, "copy.7.25") : content.text(lang, "copy.7.25"))}
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
                    ? content.text(lang, "copy.7.26")
                    : content.text(lang, "copy.7.26"))}
              </span>
            </div>
          )}
        </form>
      </Reveal>
      <Reveal delay={0.12} className="lg:col-span-5">
        <SiteSection name="contact.prompts"><aside className="lg:pt-2">
          <h2 className="section-label">
            {lang === "sl" ? content.text(lang, "copy.7.27") : content.text(lang, "copy.7.27")}
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
                    ? content.text(lang, "copy.7.28")
                    : content.text(lang, "copy.7.28")}
                  <ArrowUpRight aria-hidden="true" size={13} />
                  <span className="sr-only">
                    {lang === "sl"
                      ? content.text(lang, "copy.7.29")
                      : content.text(lang, "copy.7.29")}
                  </span>
                </a>
              )}
            </div>
          )}
        </aside></SiteSection>
      </Reveal>
    </div>
  );
}
