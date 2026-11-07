"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Bell, Maximize2, Pause, Play, RotateCcw, Sun, Moon } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { playCopy, paperWords } from "@/lib/play-copy";
import { landmarks, type LandmarkId, type Quality, type Tier } from "@/lib/play-model";
import type { Engine, Mode } from "./types";
import styles from "./PlayExperience.module.css";

export function PlayExperience({ lang, initialMode }: { lang: Lang; initialMode: Mode }) {
  const t = playCopy[lang];
  const [mode, setMode] = useState<Mode>(initialMode), [started, setStarted] = useState(false);
  const [quality, setQuality] = useState<Quality>("auto"), [tier, setTier] = useState<Tier>("balanced");
  const [loading, setLoading] = useState(false), [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
  const [paused, setPaused] = useState(false), [light, setLight] = useState(0), [place, setPlace] = useState<LandmarkId>("arrival");
  const [expanded, setExpanded] = useState(false);
  const [visited, setVisited] = useState<LandmarkId[]>(["arrival"]), [activePaper, setActivePaper] = useState(0);
  const [notes, setNotes] = useState(() => [...paperWords[lang]]), [folded, setFolded] = useState(false);
  const [paperState, setPaperState] = useState<"opened" | "folded" | "thrown" | "gathered">("opened");
  const noteRef = useRef(notes), qualityRef = useRef(quality), engine = useRef<Engine | null>(null);
  const host = useRef<HTMLDivElement>(null), frame = useRef<HTMLDivElement>(null);
  const current = landmarks.find(item => item.id === place)!;
  const tierName = lang === "en" ? { low: "Low", balanced: "Balanced", cinematic: "Cinematic" }[tier] : { low: "Nizka", balanced: "Uravnotežena", cinematic: "Filmska" }[tier];
  const motionStopped = paused || !started || loading;

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow, previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setExpanded(false); }
      if (event.key === "Tab") {
        const controls = frame.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select,input:not(:disabled),textarea:not(:disabled),[tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", key); if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true }); };
  }, [expanded]);

  useEffect(() => {
    try { const saved = localStorage.getItem("stillwater-quality"); if (["auto", "low", "balanced", "cinematic"].includes(saved ?? "")) { qualityRef.current = saved as Quality; setQuality(saved as Quality); } } catch { /* Optional preferences. */ }
  }, []);
  useEffect(() => {
    if (!started || !host.current) return;
    let cancelled = false, instance: Engine | null = null;
    setLoading(true); setFailed(false); setPaused(false); setLight(0);
    const node = host.current;
    const initialize = async () => {
      try {
        const module = mode === "world" ? await import("./world") : await import("./paper");
        if (cancelled) return;
        const options = { host: node, quality: qualityRef.current, lang, notes: noteRef.current,
          onTier: (value: Tier) => { if (!cancelled) setTier(value); },
          onPlace: (value: LandmarkId) => { if (!cancelled) { setPlace(value); setVisited(previous => previous.includes(value) ? previous : [...previous, value]); } },
          onPaper: (value: number, state: "opened" | "folded" | "thrown" = "opened") => { if (!cancelled) { setActivePaper(value); setPaperState(state); } },
          onError: () => { if (!cancelled) { setFailed(true); instance?.dispose(); engine.current = null; } },
        };
        instance = "createWorld" in module ? module.createWorld(options) : module.createPaper(options);
        if (cancelled) { instance.dispose(); return; }
        engine.current = instance; setLoading(false);
      } catch { if (!cancelled) { node.querySelectorAll("canvas").forEach(canvas => canvas.remove()); setFailed(true); setLoading(false); } }
    };
    void initialize();
    return () => { cancelled = true; instance?.dispose(); engine.current = null; };
  }, [started, mode, retry, lang]);
  function changeMode(next: Mode) {
    setMode(next); setFolded(false);
    const url = new URL(window.location.href); url.searchParams.set("scene", next); window.history.replaceState(null, "", url);
  }
  function changeQuality(value: Quality) {
    setQuality(value); qualityRef.current = value; engine.current?.setQuality(value);
    try { localStorage.setItem("stillwater-quality", value); } catch { /* Quality still works without storage. */ }
  }
  function travel(id: LandmarkId) {
    setPlace(id); setVisited(previous => previous.includes(id) ? previous : [...previous, id]); engine.current?.travel(id);
  }
  function paper(action: "open" | "crumple" | "toss" | "reset", index = activePaper) {
    setActivePaper(index); setFolded(action !== "open"); engine.current?.paper(action, index);
    setPaperState({ open: "opened", crumple: "folded", toss: "thrown", reset: "gathered" }[action] as typeof paperState);
  }
  function pause() { engine.current?.pause(!paused); setPaused(!paused); }
  function dpad(x: number, z: number) { engine.current?.move(x, z); }
  const directionButtons = [
    { x: 0, z: -1, label: t.forward, icon: ArrowUp, position: "north" },
    { x: -1, z: 0, label: t.left, icon: ArrowLeft, position: "west" },
    { x: 0, z: 1, label: t.back, icon: ArrowDown, position: "south" },
    { x: 1, z: 0, label: t.right, icon: ArrowRight, position: "east" },
  ];
  return <div className={styles.page}>
    <header className={styles.intro}><div><p className="section-label">{t.eyebrow}</p><h1>{t.title}</h1></div><p>{t.intro}</p></header>
    <div ref={frame} className={`${styles.experience} ${expanded ? styles.expanded + " play-expanded" : ""}`} role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label={expanded ? mode === "world" ? t.worldHeading : t.paperHeading : undefined}>
      <div className={styles.toolbar}>
        <div role="group" aria-label={lang === "en" ? "Choose an experience" : "Izberi doživetje"} className={styles.tabs}><button type="button" onClick={() => changeMode("world")} aria-pressed={mode === "world"}>{t.world}</button><button type="button" onClick={() => changeMode("paper")} aria-pressed={mode === "paper"}>{t.paper}</button></div>
        <div className={styles.tools}><label><span className="sr-only">{t.quality}</span><select aria-label={t.quality} value={quality} onChange={event => changeQuality(event.target.value as Quality)}><option value="auto">{t.auto}</option><option value="low">{t.low}</option><option value="balanced">{t.balanced}</option><option value="cinematic">{t.cinematic}</option></select></label><button type="button" aria-label={expanded ? t.exitFullscreen : t.fullscreen} title={expanded ? t.exitFullscreen : t.fullscreen} onClick={() => setExpanded(previous => !previous)}><Maximize2 size={16} /></button></div>
      </div>
      <div className={styles.viewport} data-mode={mode} data-night={light > 55}>
        <div ref={host} className={styles.canvasHost} tabIndex={0} role="application" aria-label={mode === "world" ? `${t.worldHeading}. ${t.worldHelp}` : `${t.paperHeading}. ${t.paperHelp}`} />
        {(!started || loading) && <div className={styles.launch}>
          <div className={mode === "world" ? styles.islandPoster : styles.paperPoster} aria-hidden="true">{mode === "world" ? <><span className={styles.posterSun} /><div className={styles.posterIsland}><span /><span /><span /></div></> : <><span /><span /><span /></>}</div>
          <div className={styles.launchWords}><span>{mode === "world" ? "01 / STILLWATER" : "02 / PAPER STUDIES"}</span><h2>{mode === "world" ? t.worldHeading : t.paperHeading}</h2><p>{mode === "world" ? t.worldCaption : t.paperCaption}</p><button type="button" disabled={loading} onClick={() => setStarted(true)}>{loading ? t.loading : mode === "world" ? t.enter : t.enterPaper}<ArrowUpRight size={18} /></button></div>
        </div>}
        {failed && <div className={styles.fallback}>
          {mode === "world" ? <div className={styles.fallbackMap} aria-hidden="true"><span>STILLWATER</span><div /><i /></div> : <div className={styles.fallbackSheet} data-folded={folded}><p>{folded ? t.fallbackCrumpled : notes[activePaper]}</p></div>}
          <p role="status">{t.fallback}</p><button type="button" className="btn-ghost" onClick={() => setRetry(previous => previous + 1)}>{t.retry}</button>
        </div>}
        {started && !loading && !failed && <>
          <div className={styles.sceneLabel}><span>{mode === "world" ? "STILLWATER" : "PAPER STUDIES"}</span><p aria-live={mode === "paper" ? "polite" : undefined}>{mode === "world" ? current[lang] : `${t.sheet} ${String(activePaper + 1).padStart(2, "0")} · ${t[paperState]}`}</p></div>
          <div className={styles.sceneTools}><span>{quality === "auto" ? `${lang === "en" ? "Adaptive" : "Prilagojeno"} / ${tierName}` : tierName}</span><button type="button" onClick={pause} aria-label={paused ? t.resume : t.pause} title={paused ? t.resume : t.pause}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>{mode === "world" && <button type="button" onClick={() => engine.current?.reframe()} aria-label={t.resetView} title={t.resetView}><RotateCcw size={16} /></button>}</div>
          {mode === "world" && !paused && <button className={styles.bellButton} type="button" onClick={() => engine.current?.ring()}><Bell size={15} aria-hidden="true" />{t.ring}</button>}
          {paused && <div className={styles.paused}><button type="button" onClick={pause}><Play size={20} />{t.resume}</button></div>}
          {mode === "world" && <div className={styles.dpad} role="group" aria-label={t.movement}>{directionButtons.map(({ x, z, label, icon: Icon, position }) => <button key={position} type="button" data-position={position} aria-label={label} disabled={motionStopped} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); dpad(x, z); }} onPointerUp={() => dpad(0, 0)} onPointerCancel={() => dpad(0, 0)} onLostPointerCapture={() => dpad(0, 0)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); dpad(x, z); } }} onKeyUp={() => dpad(0, 0)} onBlur={() => dpad(0, 0)}><Icon size={18} /></button>)}</div>}
        </>}
        {mode === "paper" && started && !loading && <div className={styles.paperDock}>
          <label><span className="sr-only">{t.sheets}</span><select aria-label={t.sheets} value={activePaper} onChange={event => paper("open", Number(event.target.value))}>{notes.map((_, index) => <option key={index} value={index}>{t.sheet} {String(index + 1).padStart(2, "0")}</option>)}</select></label>
          <div className={styles.paperActions}><button type="button" disabled={paused} onClick={() => paper("open")}>{t.open}</button><button type="button" disabled={paused} onClick={() => paper("crumple")}>{t.crumple}</button><button type="button" disabled={paused} onClick={() => paper("toss")}>{t.toss}</button><button type="button" disabled={paused} onClick={() => paper("reset")}><RotateCcw size={14} />{t.reset}</button></div>
        </div>}
      </div>
      <div className={styles.belowScene}><p>{mode === "world" ? t.worldHelp : t.paperHelp}</p>{mode === "world" && <label className={styles.light}><Sun size={15} /><span className="sr-only">{t.daylight}</span><input type="range" aria-label={t.daylight} min="0" max="100" value={light} disabled={!started || loading || failed} onChange={event => { setLight(Number(event.target.value)); engine.current?.light(Number(event.target.value) / 100); }} /><Moon size={15} /></label>}</div>
    </div>
    {mode === "world" ? <section className={styles.worldDetails} aria-label={t.places}>
      <div><p className="section-label">{t.places}</p><div className={styles.places}>{landmarks.map((item, index) => <button key={item.id} type="button" aria-pressed={place === item.id} onClick={() => travel(item.id)} disabled={!started || loading}><span>{String(index + 1).padStart(2, "0")}</span>{item[lang]}<span aria-hidden="true">{visited.includes(item.id) ? "●" : "○"}</span></button>)}</div></div>
      <div className={styles.note} aria-live="polite"><span className="section-label">{t.note} / {visited.length} / 4 {t.discovered}</span><h2>{current[lang]}</h2><p>{lang === "en" ? current.noteEn : current.noteSl}</p></div>
    </section> : <section className={styles.paperDetails} aria-label={t.paper}>
      <div className={styles.paperReading}><p className="section-label">{t.sheet} {String(activePaper + 1).padStart(2, "0")} / 06</p><blockquote>{notes[activePaper]}</blockquote></div>
      <label className={styles.write}><span>{t.write}</span><textarea maxLength={180} rows={3} value={notes[activePaper]} disabled={!started || loading} placeholder={t.placeholder} onChange={event => { const next = notes.map((note, index) => index === activePaper ? event.target.value : note); setNotes(next); noteRef.current = next; engine.current?.write(event.target.value); }} /><span>{t.temporary}</span></label>
    </section>}
    <footer className={styles.outro}><p>{t.qualityNote}</p><Link href="/">{t.backSite}<ArrowUpRight size={15} /></Link></footer>
  </div>;
}
