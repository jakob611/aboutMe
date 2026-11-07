"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass, LocateFixed, Map, Send, SlidersHorizontal, Waves, Wind, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import type { Quality, Tier } from "@/lib/play-model";
import { useSimulationAudio } from "../audio";
import { createCoastMap, type CoastEngine, type CoastPose, type CoastSettings, type CoastTelemetry } from "./session";
import { coastViewpoints, type Viewpoint } from "./terrain";
import styles from "./CoastSimulation.module.css";

const words = {
  en: {
    region: "Inspired by Strunjan · North Adriatic",
    title: "Strunjan Coast",
    help: "W A S D to walk · drag to look · E to throw",
    helpMap: "W A S D to walk · ← → to turn",
    touch: "Use the stick to walk · drag to look",
    loading: "Loading the coast",
    failed: "The coast couldn’t open on this device.",
    map: "Terrain map",
    mapView: "Map view",
    mapReturn: "Return to 3D",
    mapHint: "Interactive terrain map. The 3D renderer is unavailable.",
    retry: "Try 3D again",
    settings: "Conditions",
    close: "Close conditions",
    look: "Coastal view. Use W, A, S and D to walk. Use left and right arrows to turn or drag to look.",
    walk: "Walking control",
    altitude: "Elevation",
    water: "Water depth",
    light: "Light",
    morning: "Morning",
    day: "Midday",
    evening: "Late light",
    wind: "Wind",
    tide: "Tide",
    quality: "Graphics",
    auto: "Automatic",
    low: "Light",
    balanced: "Balanced",
    cinematic: "High",
    viewpoints: "Viewpoints",
    cove: "Pebble cove",
    shelf: "Shore shelf",
    headland: "Headland",
    return: "Return to the cove",
    throw: "Throw pebble",
    aim: "Aim by looking",
  },
  sl: {
    region: "Po navdihu Strunjana · Severni Jadran",
    title: "Strunjanska obala",
    help: "W A S D za hojo · povleci za pogled · E za met",
    helpMap: "W A S D za hojo · ← → za obračanje",
    touch: "Uporabi ročico za hojo · povleci za pogled",
    loading: "Nalaganje obale",
    failed: "Obale v tej napravi ni bilo mogoče odpreti.",
    map: "Zemljevid reliefa",
    mapView: "Pogled zemljevida",
    mapReturn: "Nazaj na 3D-prikaz",
    mapHint: "Interaktivni zemljevid reliefa. 3D-prikaz ni na voljo.",
    retry: "Ponovno poskusi 3D",
    settings: "Razmere",
    close: "Zapri razmere",
    look: "Pogled na obalo. Za hojo uporabi W, A, S in D. Za pogled uporabi levo in desno puščico ali povleci.",
    walk: "Nadzor hoje",
    altitude: "Nadmorska višina",
    water: "Globina vode",
    light: "Svetloba",
    morning: "Jutro",
    day: "Poldne",
    evening: "Pozno popoldne",
    wind: "Veter",
    tide: "Plima",
    quality: "Grafika",
    auto: "Samodejno",
    low: "Nizka",
    balanced: "Uravnotežena",
    cinematic: "Visoka",
    viewpoints: "Razgledi",
    cove: "Prodnati zaliv",
    shelf: "Obalna polica",
    headland: "Rt",
    return: "Vrni se v zaliv",
    throw: "Vrzi kamenček",
    aim: "Usmeri pogled",
  },
} as const;

const defaults: CoastSettings = { light: "evening", wind: 4.8, tide: 0, quality: "auto" };
const qualityOptions: Quality[] = ["auto", "low", "balanced", "cinematic"];
const keyCodes = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

function describeHeading(heading: number, lang: Lang) {
  const compass = lang === "sl" ? ["S", "SV", "V", "JV", "J", "JZ", "Z", "SZ"] : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return compass[Math.round(heading / 45) % 8];
}

export default function CoastSimulation({ lang }: { lang: Lang }) {
  const t = words[lang];
  const audio = useSimulationAudio();
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const engine = useRef<CoastEngine | null>(null);
  const keys = useRef(new Set<string>());
  const joystick = useRef({ x: 0, y: 0, id: -1 });
  const look = useRef({ x: 0, y: 0, id: -1 });
  const settings = useRef(defaults);
  const bookmark = useRef<CoastPose>(undefined);
  const [conditions, setConditions] = useState(defaults);
  const [tier, setTier] = useState<Tier | "map">();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [nonce, setNonce] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const [sample, setSample] = useState<CoastTelemetry>();
  const [wantsMap, setWantsMap] = useState(false);
  const [mapByChoice, setMapByChoice] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    const abort = new AbortController();
    let forcedMap = wantsMap;
    const props = {
      host: host.current,
      initial: settings.current,
      initialPose: bookmark.current,
      tier: (value: Tier | "map") => { if (!abort.signal.aborted) setTier(value); },
      telemetry: (value: CoastTelemetry) => {
        if (!abort.signal.aborted) setSample(previous => (
          previous && previous.heading === value.heading && previous.elevation === value.elevation && previous.water === value.water
            ? previous : value
        ));
      },
      onLost: () => {
        if (!abort.signal.aborted && !forcedMap) {
          forcedMap = true;
          bookmark.current = engine.current?.pose();
          setStatus("loading");
          setMapByChoice(false);
          setWantsMap(true);
        }
      },
      sound: audio.surf,
      signal: abort.signal,
    };
    async function initialize() {
      let candidate: CoastEngine;
      try {
        if (forcedMap) candidate = createCoastMap(props);
        else {
          const { createCoastEngine } = await import("./engine");
          if (abort.signal.aborted) return;
          candidate = await createCoastEngine(props);
        }
      } catch {
        if (abort.signal.aborted) return;
        setMapByChoice(false);
        try { candidate = createCoastMap(props); }
        catch { setStatus("error"); return; }
      }
      if (abort.signal.aborted) { candidate.dispose(); return; }
      engine.current = candidate;
      candidate.settings(settings.current);
      setStatus("ready");
    }
    void initialize();
    return () => { abort.abort(); engine.current?.dispose(); engine.current = null; };
  }, [audio.surf, nonce, wantsMap]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.metaKey || event.altKey || event.ctrlKey || /^(INPUT|SELECT|TEXTAREA)$/.test((event.target as HTMLElement)?.tagName)) return;
      const key = event.key.toLowerCase();
      if (key === "escape") setShowSettings(false);
      if (key === "e") {
        if (!event.repeat) engine.current?.throwPebble?.();
        return;
      }
      if (!keyCodes.includes(key)) return;
      event.preventDefault();
      keys.current.add(key);
      applyMotion();
    };
    const keyup = (event: KeyboardEvent) => {
      keys.current.delete(event.key.toLowerCase());
      applyMotion();
    };
    const clear = () => {
      keys.current.clear();
      joystick.current = { x: 0, y: 0, id: -1 };
      look.current.id = -1;
      setStick({ x: 0, y: 0 });
      applyMotion();
    };
    const hidden = () => { if (document.hidden) clear(); };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);

  function applyMotion() {
    const pressed = keys.current;
    const x = joystick.current.x + Number(pressed.has("d")) - Number(pressed.has("a"));
    const y = -joystick.current.y + Number(pressed.has("w") || pressed.has("arrowup")) - Number(pressed.has("s") || pressed.has("arrowdown"));
    const turn = Number(pressed.has("arrowright")) - Number(pressed.has("arrowleft"));
    engine.current?.move(x, y, turn);
  }

  function beginLook(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || look.current.id >= 0) return;
    look.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    view.current?.focus({ preventScroll: true });
  }
  function turnView(event: PointerEvent<HTMLDivElement>) {
    const pointer = look.current;
    if (pointer.id !== event.pointerId) return;
    const scale = event.pointerType === "touch" ? .0049 : .0036;
    engine.current?.look((event.clientX - pointer.x) * scale, (pointer.y - event.clientY) * scale);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }
  function endLook(event: PointerEvent<HTMLDivElement>) {
    if (look.current.id === event.pointerId) look.current.id = -1;
  }
  function beginWalk(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || joystick.current.id >= 0) return;
    joystick.current.id = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    steer(event);
  }
  function steer(event: PointerEvent<HTMLDivElement>) {
    if (joystick.current.id !== event.pointerId) return;
    const box = event.currentTarget.getBoundingClientRect();
    const radius = box.width * .35;
    let x = (event.clientX - box.left - box.width / 2) / radius, y = (event.clientY - box.top - box.height / 2) / radius;
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    if (length < .10) x = y = 0;
    joystick.current.x = x;
    joystick.current.y = y;
    setStick({ x: x * radius, y: y * radius });
    applyMotion();
  }
  function endWalk(event: PointerEvent<HTMLDivElement>) {
    if (joystick.current.id !== event.pointerId) return;
    joystick.current = { x: 0, y: 0, id: -1 };
    setStick({ x: 0, y: 0 });
    applyMotion();
  }

  function adjust(patch: Partial<CoastSettings>) {
    settings.current = { ...settings.current, ...patch };
    setConditions(settings.current);
    engine.current?.settings(settings.current);
  }
  function visit(where: Viewpoint) {
    keys.current.clear();
    joystick.current = { x: 0, y: 0, id: -1 };
    setStick({ x: 0, y: 0 });
    engine.current?.visit(where);
    setShowSettings(false);
    view.current?.focus({ preventScroll: true });
  }
  function changeView(map: boolean) {
    bookmark.current = engine.current?.pose();
    setStatus("loading");
    setMapByChoice(map);
    setWantsMap(map);
    setShowSettings(false);
    setNonce(value => value + 1);
  }
  const heading = Math.round(sample?.heading ?? 332) % 360;
  const elevation = sample?.elevation ?? .46;
  const water = sample?.water ?? 0;
  const format = (value: number) => value.toLocaleString(lang, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const formatTide = (value: number) => value.toLocaleString(lang, { maximumFractionDigits: 2, minimumFractionDigits: 2, signDisplay: "exceptZero" });

  return (
    <section className={styles.frame} aria-label={t.title} data-coast-mode={tier ?? "loading"}>
      <div className={styles.scene} ref={host} />
      <div ref={view} className={styles.view} aria-label={t.look} role="group" tabIndex={status === "ready" ? 0 : -1}
        onPointerDown={beginLook} onPointerMove={turnView} onPointerUp={endLook}
        onPointerCancel={endLook} onLostPointerCapture={endLook} />
      <div className={styles.vignette} aria-hidden="true" />
      <header className={styles.field}>
        <p>{tier === "map" ? t.map : t.region}</p>
        <h1>{t.title}</h1>
      </header>
      {status === "ready" && <>
        <div className={styles.compass} aria-label={`${describeHeading(heading, lang)} ${heading}°`}>
          <Compass size={15} aria-hidden="true" />
          <span>{describeHeading(heading, lang)}</span><b>{heading}°</b>
        </div>
        <div className={styles.hint}>
          <span className={styles.desktop}>{tier === "map" ? t.helpMap : t.help}</span>
          <span className={styles.mobile}>{t.touch}</span>
        </div>
        {tier !== "map" && <div className={styles.reticle} aria-hidden="true"><i /><span>{t.aim}</span></div>}
        <div className={styles.joystick} role="group" aria-label={t.walk} onPointerDown={beginWalk} onPointerMove={steer}
          onPointerUp={endWalk} onPointerCancel={endWalk} onLostPointerCapture={endWalk}>
          <ArrowUp className={styles.stickUp} size={13} />
          <ArrowRight className={styles.stickRight} size={13} />
          <ArrowDown className={styles.stickDown} size={13} />
          <ArrowLeft className={styles.stickLeft} size={13} />
          <div className={styles.puck} style={{ transform: `translate3d(${stick.x}px,${stick.y}px,0)` }} />
        </div>
        <div className={styles.actions}>
          {tier !== "map" && <button type="button" className={styles.throw} onClick={() => engine.current?.throwPebble?.()} aria-keyshortcuts="E">
            <Send size={17} /><span>{t.throw}</span>
          </button>}
          <button type="button" className={styles.locate} aria-label={t.return} title={t.return} onClick={() => visit("cove")}><LocateFixed size={18} /></button>
          <button type="button" className={styles.conditions} aria-expanded={showSettings} aria-controls="coast-conditions" onClick={() => setShowSettings(!showSettings)}>
            <SlidersHorizontal size={17} /><span>{t.settings}</span>
          </button>
        </div>
        <p className={styles.reading}>{water > .055 ? t.water : t.altitude} <b>{format(water > .055 ? water : elevation)} m</b></p>
        {tier === "map" && <aside className={styles.mapNotice}>
          {!mapByChoice && <span>{t.mapHint}</span>}
          <button type="button" onClick={() => changeView(false)}>{mapByChoice ? t.mapReturn : t.retry}</button>
        </aside>}
        {showSettings && <aside className={styles.panel} id="coast-conditions" aria-label={t.settings}>
          <div className={styles.panelHeader}><strong>{t.settings}</strong><button type="button" aria-label={t.close} onClick={() => setShowSettings(false)}><X size={18} /></button></div>
          {tier !== "map" && <><fieldset><legend>{t.light}</legend><div className={styles.segmented}>
            {(["morning", "day", "evening"] as const).map(light =>
              <button key={light} type="button" aria-pressed={conditions.light === light} onClick={() => adjust({ light })}>{t[light]}</button>)}
          </div></fieldset>
          <label className={styles.range}><span><Wind size={15} />{t.wind}<output>{format(conditions.wind)} m/s</output></span>
            <input type="range" min="1" max="12" step=".1" value={conditions.wind} onChange={event => adjust({ wind: Number(event.target.value) })} />
          </label></>}
          <label className={styles.range}><span><Waves size={15} />{t.tide}<output>{formatTide(conditions.tide)} m</output></span>
            <input type="range" min="-.4" max=".5" step=".05" value={conditions.tide} onChange={event => adjust({ tide: Number(event.target.value) })} />
          </label>
          {tier !== "map" && <label className={styles.quality}>{t.quality}
            <select value={conditions.quality} onChange={event => adjust({ quality: event.target.value as Quality })}>
              {qualityOptions.map(option => <option value={option} key={option}>{t[option]}</option>)}
            </select>
          </label>}
          <fieldset><legend>{t.viewpoints}</legend><div className={styles.segmented}>
            {coastViewpoints.map(point => <button key={point.id} type="button" onClick={() => visit(point.id)}>{t[point.id]}</button>)}
          </div></fieldset>
          {tier !== "map" && <button type="button" className={styles.mapButton} onClick={() => changeView(true)}><Map size={16} />{t.mapView}</button>}
        </aside>}
      </>}
      {status !== "ready" && <div className={styles.loading} role="status">
        <Waves size={24} /><p>{status === "loading" ? t.loading : t.failed}</p>
        {status === "error" && <button type="button" onClick={() => changeView(false)}>{t.retry}</button>}
      </div>}
    </section>
  );
}
