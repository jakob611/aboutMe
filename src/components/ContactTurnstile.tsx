"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";

type TurnstileApi = {
  render(container: HTMLElement, options: {
    sitekey: string;
    action: "contact" | "comment";
    language: Lang;
    theme: "dark";
    size: "compact" | "flexible";
    appearance: "interaction-only";
    "refresh-expired": "auto";
    retry: "auto";
    callback(token: string): void;
    "expired-callback"(): void;
    "timeout-callback"(): void;
    "error-callback"(): boolean;
  }): string;
  reset(id: string): void;
  remove(id: string): void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

type Props = {
  siteKey: string;
  action?: "contact" | "comment";
  lang: Lang;
  label: string;
  resetKey: number;
  onToken(token: string): void;
  onError(): void;
  onExpired(): void;
};

/** Owns one explicitly rendered widget; no token is stored across pages or retries. */
export function ContactTurnstile({ siteKey, action = "contact", lang, label, resetKey, onToken, onError, onExpired }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<{ api: TurnstileApi; id: string } | null>(null);
  const callbacks = useRef({ onToken, onError, onExpired });
  const [ready, setReady] = useState(false);
  useEffect(() => { callbacks.current = { onToken, onError, onExpired }; }, [onToken, onError, onExpired]);

  useEffect(() => {
    const element = container.current;
    const api = window.turnstile;
    if (!ready || !element || !api) return;
    let active = true;
    let compact = element.clientWidth < 300;
    function render() {
      if (!active || !element || !api) return;
      callbacks.current.onToken("");
      try {
        const id = api.render(element, {
          sitekey: siteKey,
          action,
          language: lang,
          theme: "dark",
          size: compact ? "compact" : "flexible",
          appearance: "interaction-only",
          "refresh-expired": "auto",
          retry: "auto",
          callback(token) { if (active) callbacks.current.onToken(token); },
          "expired-callback"() { if (active) { callbacks.current.onToken(""); callbacks.current.onExpired(); } },
          "timeout-callback"() { if (active) { callbacks.current.onToken(""); callbacks.current.onExpired(); } },
          "error-callback"() { if (active) { callbacks.current.onToken(""); callbacks.current.onError(); } return true; },
        });
        widget.current = { api, id };
      } catch { callbacks.current.onError(); }
    }
    render();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      const next = element.clientWidth < 300;
      if (next === compact || !active) return;
      compact = next;
      if (widget.current) widget.current.api.remove(widget.current.id);
      widget.current = null;
      render();
    });
    observer?.observe(element);
    return () => {
      active = false;
      observer?.disconnect();
      if (widget.current) widget.current.api.remove(widget.current.id);
      widget.current = null;
    };
  }, [ready, siteKey, action, lang]);

  useEffect(() => {
    if (!widget.current) return;
    callbacks.current.onToken("");
    widget.current.api.reset(widget.current.id);
  }, [resetKey]);

  return <>
    <Script
      id="contact-turnstile-script"
      src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      strategy="afterInteractive"
      onReady={() => setReady(true)}
      onError={() => { callbacks.current.onToken(""); callbacks.current.onError(); }}
    />
    <div ref={container} aria-label={label} className="min-w-0" />
  </>;
}
