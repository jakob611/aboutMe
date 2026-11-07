"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, ChevronLeft, ChevronRight, CircleDot, Diamond, Gamepad2, Heart, Pause, Play, RotateCcw, Volume2, VolumeX, Wind } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { coastLength, paperThrows, powerFromDrag, type RunAction } from "@/lib/arcade";
import { playCopy } from "@/lib/play-copy";
import type { Quality, Tier } from "@/lib/play-model";
import { emptySnapshot, type Feedback, type Game, type Mode, type Phase, type Snapshot } from "./arcade-types";
import styles from "./PlayExperience.module.css";

const graphicOptions: Quality[] = ["auto", "low", "balanced", "cinematic"];
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* optional */ } };
const scoreKey = (mode: Mode) => `arcade-best-${mode}`;
const number = (n: number) => n.toString().padStart(2, "0");

function playSound(context: AudioContext, event: Feedback | "go" | "toss") {
  const notes = {
    light: [740, 1110], hit: [185, 110], clear: [420, 680], chapter: [520, 660, 880], finish: [523, 659, 784, 1047],
    perfect: [660, 880, 1175], miss: [215], go: [440, 660], toss: [315, 190],
  }[event];
  const gain = context.createGain(), now = context.currentTime;
  gain.gain.value = .16; gain.connect(context.destination);
  notes.forEach((hz, i) => {
    const osc = context.createOscillator(), envelope = context.createGain();
    const start = now + i * .065;
    osc.type = event === "hit" ? "triangle" : "sine"; osc.frequency.value = hz;
    envelope.gain.setValueAtTime(.001, start); envelope.gain.exponentialRampToValueAtTime(.37, start + .014);
    envelope.gain.exponentialRampToValueAtTime(.001, start + .19);
    osc.connect(envelope); envelope.connect(gain);
    osc.start(start); osc.stop(start + .20);
    if (i === notes.length - 1) osc.onended = () => gain.disconnect();
  });
}

export function PlayExperience({ lang, initialMode: mode }: { lang: Lang; initialMode: Mode }) {
  const t = playCopy[lang], coast = mode === "world";
  const name = coast ? t.world : t.paper;
  const chapters = coast ? t.worldChapters : t.paperChapters;
  const [phase, setPhase] = useState<Phase>("ready");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [state, setState] = useState<Snapshot>(emptySnapshot);
  const [tier, setTier] = useState<Tier | "2d" | null>(null);
  const [quality, setQuality] = useState<Quality>("auto");
  const [sound, setSound] = useState(false);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [reload, setReload] = useState(0);
  const [feedback, setFeedback] = useState<{ event: Feedback; id: number; points: number }>();
  const host = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const engine = useRef<Game | null>(null);
  const phaseRef = useRef<Phase>("ready"), stateRef = useRef<Snapshot>(emptySnapshot);
  const audio = useRef<AudioContext | null>(null), soundRef = useRef(false);
  const bestRef = useRef(0), signal = useRef(0);
  const gesture = useRef<{ id: number; x: number; y: number; unit: number; aimScale: number } | null>(null);
  const keyboardShot = useRef({ aim: 0, power: .73 });
  const flat = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const saved = read("arcade-graphics") as Quality | null;
    const selected = saved && graphicOptions.includes(saved) ? saved : "auto";
    bestRef.current = Number(read(scoreKey(mode))) || 0;
    soundRef.current = read("arcade-sound") === "on";
    setBest(bestRef.current); setSound(soundRef.current); setQuality(selected);
    if (!host.current) return;
    const options = {
      host: host.current, quality: selected,
      onTier(value: Tier | "2d") { if (!cancelled) setTier(value); },
      onUpdate(patch: Partial<Snapshot>, event?: Feedback) {
        if (cancelled) return;
        stateRef.current = { ...stateRef.current, ...patch };
        setState(stateRef.current);
        if (event && phaseRef.current === "playing") {
          setFeedback({ event, id: ++signal.current, points: stateRef.current.points });
          if (soundRef.current && audio.current) playSound(audio.current, event);
        }
      },
      onEnd() {
        if (cancelled) return;
        const score = stateRef.current.score;
        if (score > bestRef.current) {
          bestRef.current = score; setBest(score); setNewBest(true); write(scoreKey(mode), String(score));
        }
        phaseRef.current = "finished"; setPhase("finished");
      },
      onLost() {
        if (cancelled) return;
        flat.current = true; phaseRef.current = "ready";
        setStatus("loading"); setPhase("ready"); setFeedback(undefined); setState(emptySnapshot); setReload(value => value + 1);
      },
    };
    const pending = mode === "world"
      ? import("./coast").then(module => cancelled ? null : module.createCoast(options, flat.current))
      : import("./paper-court").then(module => cancelled ? null : module.createPaperGame(options));
    pending.then(game => {
      if (!game) return;
      if (cancelled) { game.dispose(); return; }
      engine.current = game; setStatus("ready");
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; engine.current?.dispose(); engine.current = null; };
  }, [mode, reload]);

  useEffect(() => () => { void audio.current?.close().catch(() => {}); audio.current = null; }, []);
  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(undefined), feedback.event === "chapter" ? 2200 : 1050);
    return () => window.clearTimeout(id);
  }, [feedback]);
  useEffect(() => {
    if (phase === "paused" || phase === "finished") primary.current?.focus({ preventScroll: true });
  }, [phase]);

  const soundEffect = useCallback((event: Feedback | "go" | "toss") => {
    if (!soundRef.current) return;
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume().catch(() => {});
      playSound(audio.current, event);
    } catch { /* audio is optional */ }
  }, []);
  function toggleSound() {
    const value = !soundRef.current;
    soundRef.current = value; setSound(value); write("arcade-sound", value ? "on" : "off");
    if (value) soundEffect("go");
    else void audio.current?.suspend().catch(() => {});
  }
  function start(reset: boolean) {
    if (!engine.current) return;
    if (reset) {
      engine.current.reset(); stateRef.current = emptySnapshot; setState(emptySnapshot);
      setFeedback(undefined); setNewBest(false); keyboardShot.current = { aim: 0, power: .73 };
    }
    phaseRef.current = "playing"; setPhase("playing"); engine.current.play(true);
    input.current?.focus({ preventScroll: true });
    soundEffect("go");
  }
  function run(action: RunAction) { if (phaseRef.current === "playing") engine.current?.run?.(action); }
  const toss = useCallback((aim: number, power: number) => {
    if (phaseRef.current !== "playing") return;
    engine.current?.toss?.(aim, power);
    soundEffect("toss");
  }, [soundEffect]);
  function pause() {
    if (phaseRef.current !== "playing") return;
    engine.current?.play(false);
    gesture.current = null; phaseRef.current = "paused"; setPhase("paused");
  }
  useEffect(() => {
    const onHidden = () => { if (document.hidden) pause(); };
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape" && phaseRef.current === "playing") {
        event.preventDefault(); pause(); return;
      }
      if (phaseRef.current !== "playing" || /^(INPUT|SELECT|TEXTAREA)$/.test((event.target as HTMLElement)?.tagName)) return;
      const key = event.key.toLowerCase();
      if (key === " " && /^(BUTTON|A)$/.test((event.target as HTMLElement)?.tagName)) return;
      if (!["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s", " "].includes(key)) return;
      event.preventDefault();
      if (coast) {
        if (event.repeat) return;
        if (key === "arrowleft" || key === "a") run("left");
        else if (key === "arrowright" || key === "d") run("right");
        else if (key === " " || key === "arrowup" || key === "w") run("jump");
        return;
      }
      const shot = keyboardShot.current;
      if (key === " ") { if (!event.repeat) toss(shot.aim, shot.power); return; }
      if (key === "arrowleft" || key === "a") shot.aim = Math.max(-3.9, shot.aim - .19);
      if (key === "arrowright" || key === "d") shot.aim = Math.min(3.9, shot.aim + .19);
      if (key === "arrowup" || key === "w") shot.power = Math.min(1.25, shot.power + .065);
      if (key === "arrowdown" || key === "s") shot.power = Math.max(.18, shot.power - .065);
      engine.current?.aim?.(shot.aim, shot.power);
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("visibilitychange", onHidden); window.removeEventListener("keydown", onKey);
    };
  }, [coast, toss]);

  function gestureStart(event: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== "playing" || !event.isPrimary || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, unit: Math.max(52, Math.min(180, Math.min(rect.height * .23, rect.width * .32))), aimScale: Math.max(90, Math.min(rect.width * .39, rect.height * .47)) };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function gestureMove(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (coast || !g || g.id !== event.pointerId || phaseRef.current !== "playing") return;
    const up = g.y - event.clientY;
    engine.current?.aim?.((event.clientX - g.x) / g.aimScale * 3.9, powerFromDrag(up, g.unit));
  }
  function gestureEnd(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    gesture.current = null;
    engine.current?.clearAim?.();
    const dx = event.clientX - g.x, up = g.y - event.clientY;
    if (coast) {
      if (Math.abs(dx) >= 24 && Math.abs(dx) > Math.abs(up)) run(dx < 0 ? "left" : "right");
      else if (up > 20) run("jump");
    } else if (up > 13) {
      toss(dx / g.aimScale * 3.9, powerFromDrag(up, g.unit));
    }
  }
  function gestureCancel() { gesture.current = null; engine.current?.clearAim?.(); }

  const selectedGraphics = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as Quality;
    setQuality(value); write("arcade-graphics", value); engine.current?.quality?.(value);
  };
  const text = feedback?.event === "chapter" ? chapters[state.chapter]
    : feedback?.event === "light" ? (state.chain > 1 ? `${t.gem} ×${state.chain}` : t.gem)
    : feedback?.event === "hit" ? (coast ? t.hit : `${t.basket} +${feedback.points}`)
    : feedback?.event === "perfect" ? `${t.perfect} +${feedback.points}`
    : feedback?.event === "miss" ? t.miss
    : feedback?.event === "clear" ? t.clear : "";
  const resultTitle = coast ? state.won ? t.worldWin : t.worldLose : state.won ? t.paperWin : t.paperLose;
  const resultDetail = coast ? state.won ? t.worldWinDetail : t.worldLoseDetail : state.won ? t.paperWinDetail : t.paperLoseDetail;
  const gameLink = (target: Mode) => `/play?${target === "paper" ? "scene=paper&" : ""}lang=${lang}`;

  return (
    <section id="arcade" className={styles.arcade} data-mode={mode} data-phase={phase} aria-label={name}>
      <header className={styles.topbar}>
        <Link className={styles.back} href={`/?lang=${lang}#playground`} aria-label={t.home}><ArrowLeft size={17} /><span>{t.home}</span></Link>
        <nav className={styles.tabs} aria-label={t.game}>
          <Link href={gameLink("world")} prefetch={false} scroll={false} aria-current={coast ? "page" : undefined}><span>01</span>{t.worldTab}</Link>
          <Link href={gameLink("paper")} prefetch={false} scroll={false} aria-current={!coast ? "page" : undefined}><span>02</span>{t.paperTab}</Link>
        </nav>
        <div className={styles.utility}>
          <button type="button" onClick={toggleSound} aria-label={t.sound} aria-pressed={sound}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          {phase === "playing" && <button type="button" onClick={pause} aria-label={t.pause}><Pause size={18} /></button>}
        </div>
      </header>

      <div className={styles.game}>
        <div className={styles.scene} ref={host} />
        <div className={styles.input} ref={input} tabIndex={-1} aria-label={coast ? t.worldKeys : t.setAim}
          onPointerDown={gestureStart} onPointerMove={gestureMove} onPointerUp={gestureEnd} onPointerCancel={gestureCancel} onLostPointerCapture={gestureCancel} />
        <div className={styles.vignette} aria-hidden="true" />

        <div className={styles.hud} aria-label={t.score}>
          <div className={styles.hudLeft}>
            <div className={styles.stageLabel}><span>{number(state.chapter + 1)}</span><strong>{chapters[state.chapter]}</strong></div>
            {coast ? <div className={styles.progress} role="progressbar" aria-label={t.meters} aria-valuemax={coastLength} aria-valuenow={state.distance}><div style={{ width: `${state.distance / coastLength * 100}%` }} /></div>
              : <div className={styles.dots} aria-label={`${t.shots}: ${state.shots}/${paperThrows}`}>{Array.from({ length: paperThrows }, (_, i) => <span key={i} data-spent={i < state.shots} />)}</div>}
          </div>
          <div className={styles.score}><span>{t.score}</span><strong>{state.score.toString().padStart(4, "0")}</strong></div>
          <div className={styles.hudRight}>
            {coast ? <div className={styles.hearts} aria-label={`${t.hearts}: ${state.lives}/3`}>{[0, 1, 2].map(i => <Heart key={i} size={17} fill={i < state.lives ? "currentColor" : "none"} opacity={i < state.lives ? 1 : .36} />)}</div>
              : <div className={styles.baskets} aria-label={`${t.baskets}: ${state.hits}/${paperThrows}`}><CircleDot size={16} /><b>{state.hits}<span>/{paperThrows}</span></b></div>}
            <span className={styles.best}>{t.best} <b>{best}</b></span>
          </div>
        </div>

        {phase === "playing" && <>
          <div className={styles.live} role="status" aria-live="polite">{text}</div>
          {text && feedback && <div key={feedback.id} className={styles.feedback} data-event={feedback.event} aria-hidden="true">{text}</div>}
          {feedback?.event === "hit" && coast && <div key={feedback.id} className={styles.damage} aria-hidden="true" />}
          <div className={styles.controls}>
            {coast ? <>
              <div className={styles.steer}><button type="button" aria-label={t.left} onClick={() => run("left")}><ChevronLeft /></button><button type="button" aria-label={t.right} onClick={() => run("right")}><ChevronRight /></button></div>
              <span className={styles.keyHint}>{t.worldKeys}</span>
              <button className={styles.jump} type="button" onClick={() => run("jump")}><ArrowUp size={20} />{t.jump}</button>
            </> : <>
              {state.chapter === 2 ? <div className={styles.wind} aria-label={`${t.wind}: ${state.wind}`}><Wind size={18} /><span>{t.wind}</span>{state.wind < 0 ? <ArrowLeft size={16} /> : state.wind > 0 ? <ArrowRight size={16} /> : <span>–</span>}</div>
                : <span className={styles.swipeHint}><ArrowUp size={15} />{lang === "sl" ? "Povleci in spusti" : "Swipe up to throw"}</span>}
              <span className={styles.keyHint}>{t.paperKeys}</span>
              <button className={styles.jump} type="button" onClick={() => toss(keyboardShot.current.aim, keyboardShot.current.power)}><ArrowUpRight size={19} />{t.toss}</button>
            </>}
          </div>
        </>}

        {phase !== "playing" && <div className={styles.overlay} data-view={phase}>
          <div className={styles.card}>
            <p className={styles.kicker}>{phase === "finished" && newBest ? t.newBest : coast ? t.worldGenre : t.paperGenre}</p>
            {phase === "ready" ? <>
              <h1>{coast ? <>Stillwater<br /><em>Rush</em></> : <>Paper<br /><em>League</em></>}</h1>
              <p className={styles.pitch}>{coast ? t.worldPitch : t.paperPitch}</p>
              <p className={styles.instructions}><Gamepad2 size={17} /><span>{coast ? t.worldTouch : t.paperTouch}</span></p>
              <div className={styles.cardActions}>
                <button type="button" className={styles.primary} disabled={status === "loading"} onClick={() => {
                  if (status === "error") { setStatus("loading"); setReload(value => value + 1); }
                  else start(true);
                }}><Play size={17} fill="currentColor" />{status === "loading" ? t.loading : status === "error" ? t.retry : coast ? t.worldStart : t.paperStart}</button>
                {coast && tier !== "2d" && <label className={styles.graphics}>{t.quality}<select value={quality} onChange={selectedGraphics} aria-label={t.quality}>{graphicOptions.map(value => <option key={value} value={value}>{t[value]}</option>)}</select></label>}
              </div>
              {status === "error" && <p role="alert" className={styles.pitch}>{t.loadError}</p>}
            </> : phase === "paused" ? <>
              <h2>{t.paused}</h2>
              <p className={styles.pitch}>{coast ? t.worldKeys : t.paperKeys}</p>
              <div className={styles.cardActions}>
                <button type="button" className={styles.primary} ref={primary} onClick={() => start(false)}><Play size={17} fill="currentColor" />{t.resume}</button>
                <button type="button" className={styles.secondary} onClick={() => start(true)}><RotateCcw size={16} />{t.restart}</button>
              </div>
              {coast && tier !== "2d" && <label className={styles.graphics}>{t.quality}<select value={quality} onChange={selectedGraphics} aria-label={t.quality}>{graphicOptions.map(value => <option key={value} value={value}>{t[value]}</option>)}</select></label>}
            </> : <>
              <h2>{resultTitle}</h2>
              <div className={styles.result}><div><span>{t.score}</span><strong>{state.score}</strong></div><div>{coast ? <Diamond size={16} /> : <CircleDot size={16} />}<span>{coast ? t.lights : t.baskets}</span><strong>{coast ? state.lights : `${state.hits}/${paperThrows}`}</strong></div></div>
              <p className={styles.pitch}>{resultDetail}</p>
              <div className={styles.cardActions}>
                <button type="button" className={styles.primary} ref={primary} onClick={() => start(true)}><RotateCcw size={17} />{t.again}</button>
                <Link className={styles.secondary} href={gameLink(coast ? "paper" : "world")} scroll={false}>{coast ? t.paperTab : t.worldTab}<ArrowUpRight size={16} /></Link>
              </div>
            </>}
          </div>
        </div>}
      </div>
    </section>
  );
}
