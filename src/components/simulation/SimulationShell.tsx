"use client";

import { Component, useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, AudioLines, VolumeX } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { simulationCopy } from "@/lib/simulation-copy";
import { SimulationAudioProvider, useSoundscape } from "./audio";
import styles from "./SimulationShell.module.css";

export type SimulationMode = "world" | "paper";
const Coast = dynamic(() => import("./coast/CoastSimulation"), { ssr: false });
const Paper = dynamic(() => import("./paper/PaperSimulation"), { ssr: false });
let focusOnSwitch: SimulationMode | undefined;

class SceneBoundary extends Component<{ children: ReactNode; lang: Lang }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    const copy = simulationCopy[this.props.lang];
    return <div className={styles.failure} role="alert">
      <p>{copy.error}</p><button type="button" onClick={() => location.reload()}>{copy.retry}</button>
    </div>;
  }
}

export function SimulationShell({ lang, mode }: { lang: Lang; mode: SimulationMode }) {
  const copy = simulationCopy[lang];
  const audio = useSoundscape(mode);
  const tabs = useRef<HTMLElement>(null);
  const coast = mode === "world";
  const scene = coast ? copy.world : copy.paper;
  const go = (view: SimulationMode) => `/play?${view === "paper" ? "scene=paper&" : ""}lang=${lang}`;
  useEffect(() => {
    if (focusOnSwitch !== mode) return;
    focusOnSwitch = undefined;
    tabs.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus({ preventScroll: true });
  }, [mode]);
  function switchByKeyboard(event: MouseEvent<HTMLAnchorElement>, view: SimulationMode) {
    if (!event.detail && view !== mode && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) focusOnSwitch = view;
  }
  return <section id="field-studies" className={styles.shell} data-mode={mode} aria-label={scene}>
    <header className={styles.bar}>
      <Link href={`/?lang=${lang}#playground`} className={styles.home} aria-label={copy.back}>
        <ArrowLeft size={17} strokeWidth={1.6} /><span>{copy.back}</span>
      </Link>
      <nav className={styles.tabs} aria-label={copy.choose} ref={tabs}>
        <Link href={go("world")} scroll={false} prefetch={false} onClick={event => switchByKeyboard(event, "world")} aria-current={coast ? "page" : undefined}><span aria-hidden="true">01</span>{copy.worldTab}</Link>
        <Link href={go("paper")} scroll={false} prefetch={false} onClick={event => switchByKeyboard(event, "paper")} aria-current={coast ? undefined : "page"}><span aria-hidden="true">02</span>{copy.paperTab}</Link>
      </nav>
      <div className={styles.right}>
        <span className={styles.collection}>{copy.title}</span>
        <button type="button" className={styles.sound} onClick={audio.toggle} aria-label={copy.sound} aria-pressed={audio.enabled}
          title={audio.unavailable ? copy.soundUnavailable : copy.sound}>
          {audio.enabled ? <AudioLines size={19} strokeWidth={1.6} /> : <VolumeX size={18} strokeWidth={1.6} />}
        </button>
        {audio.unavailable && <span role="status" className={styles.srOnly}>{copy.soundUnavailable}</span>}
      </div>
    </header>
    <div className={styles.viewport}>
      <div className={styles.backdrop} aria-hidden="true" />
      {!coast && <h1 className={styles.srOnly}>{scene}</h1>}
      <div className={styles.boot} role="status"><span aria-hidden="true" /><p>{copy.loading}</p></div>
      <div className={styles.sceneFrame}>
        <SimulationAudioProvider value={audio.value}>
          <SceneBoundary lang={lang}>{coast ? <Coast lang={lang} /> : <Paper lang={lang} />}</SceneBoundary>
        </SimulationAudioProvider>
      </div>
    </div>
  </section>;
}
