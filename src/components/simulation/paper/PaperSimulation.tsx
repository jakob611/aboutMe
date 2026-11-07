"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CircleHelp, FoldHorizontal, Hand, Minus, Move, Plus, RotateCcw, ScanLine, Send, SlidersHorizontal, UnfoldHorizontal, Wind, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { useSimulationAudio } from "../audio";
import type { PaperAction, PaperDesk, PaperQuality, PaperState } from "./paper-view";
import styles from "./PaperSimulation.module.css";

const strings = {
  en: {
    title: "Paper workbench", material: "A4 · 80 g/m²", subtitle: "210 × 297 mm · 4.99 g",
    loading: "Preparing the workbench…", unavailable: "This browser couldn't open the workbench.",
    grab: "Grab", look: "View", fold: "Fold", unfold: "Unfold", crumple: "Crumple",
    smooth: "Flatten", toss: "Toss", reset: "New sheet", tools: "Paper tools", view: "View controls",
    zoomIn: "Zoom in", zoomOut: "Zoom out", resetView: "Reset view", settings: "Workbench settings", help: "How to use",
    fan: "Fan", off: "Off", breeze: "Low", strong: "High", graphics: "Graphics",
    auto: "Auto", low: "Low", high: "High", axis: "Fold along", long: "Long edge", short: "Short edge",
    held: "Holding paper", working: "Shaping paper", fallback: "Lightweight view",
    grabHint: "Drag an edge or corner to lift the sheet. Release while moving to flick it.",
    viewHint: "Drag to rotate the view. Scroll or pinch to zoom.",
    keyboard: "Keyboard: arrows rotate, + and − zoom. F folds, C crumples, S flattens, T tosses and R starts a new sheet.",
    model: "Folds and compression leave visible creases. Gravity is modelled at real scale. Airflow, bending and contact are approximations.",
    close: "Close",
  },
  sl: {
    title: "Papir na delovni mizi", material: "A4 · 80 g/m²", subtitle: "210 × 297 mm · 4,99 g",
    loading: "Pripravljamo delovno mizo …", unavailable: "Brskalnik ni mogel odpreti delovne mize.",
    grab: "Primi", look: "Pogled", fold: "Prepogni", unfold: "Razgrni", crumple: "Zmečkaj",
    smooth: "Zravnaj", toss: "Vrzi", reset: "Nov list", tools: "Orodja za papir", view: "Upravljanje pogleda",
    zoomIn: "Približaj", zoomOut: "Oddalji", resetView: "Ponastavi pogled", settings: "Nastavitve delovne mize", help: "Navodila",
    fan: "Ventilator", off: "Izklopljen", breeze: "Šibek", strong: "Močan", graphics: "Grafika",
    auto: "Samodejno", low: "Nizka", high: "Visoka", axis: "Pregib vzdolž", long: "Dolge stranice", short: "Kratke stranice",
    held: "Držiš list", working: "Oblikovanje papirja", fallback: "Preprost pogled",
    grabHint: "Povleci rob ali vogal in dvigni list. Spusti ga med premikom, da ga vržeš.",
    viewHint: "Povleci za vrtenje pogleda. Približaj s koleščkom ali dvema prstoma.",
    keyboard: "Tipkovnica: puščice vrtijo pogled, + in − ga približata ali oddaljita. F prepogne, C zmečka, S zravna, T vrže in R doda nov list.",
    model: "Po prepogibanju in mečkanju ostanejo vidne gube. Gravitacija je v pravem merilu. Gibanje zraka, upogibanje in stiki so približki.",
    close: "Zapri",
  },
} as const;

const defaultState: PaperState = { folded: false, forming: false, holding: false, fallback: false };

export default function PaperSimulation({ lang }: { lang: Lang }) {
  const t = strings[lang];
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<PaperDesk | null>(null);
  const { paper } = useSimulationAudio();
  const sound = useRef(paper);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [state, setState] = useState<PaperState>(defaultState);
  const [mode, setMode] = useState<"grab" | "view">("grab");
  const [panel, setPanel] = useState<"help" | "settings" | null>(null);
  const [axis, setAxis] = useState<"long" | "short">("long");
  const [quality, setQuality] = useState<PaperQuality>("auto");
  const [fan, setFan] = useState(0);

  useEffect(() => { sound.current = paper; }, [paper]);
  useEffect(() => {
    let cancelled = false;
    import("./paper-view").then(({ createPaperDesk }) => {
      if (cancelled || !host.current) return;
      engine.current = createPaperDesk(host.current, {
        state: setState,
        effect: (kind, strength) => sound.current(kind, strength),
      });
      setStatus("ready");
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => {
      cancelled = true;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  const perform = (action: PaperAction) => {
    if (engine.current?.action(action, axis === "short")) {
      engine.current.orbit(false);
      setMode("grab");
    }
  };
  const setTool = (tool: "grab" | "view") => {
    engine.current?.orbit(tool === "view");
    setMode(tool);
  };
  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && panel) { setPanel(null); return; }
    if (event.altKey || event.metaKey || event.ctrlKey || event.target !== host.current) return;
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8],
    };
    if (arrows[event.key]) {
      event.preventDefault();
      engine.current?.rotate(...arrows[event.key]);
      return;
    }
    const char = event.key.toLowerCase();
    if (char === "+" || char === "=") engine.current?.magnify(-.12);
    else if (char === "-") engine.current?.magnify(.12);
    else if (char === "f") perform(state.folded ? "unfold" : "fold");
    else if (char === "c") perform("crumple");
    else if (char === "s") perform("smooth");
    else if (char === "t") perform("toss");
    else if (char === "r") perform("reset");
    else if (char === "g") setTool("grab");
    else if (char === "v") setTool("view");
    else return;
    event.preventDefault();
  }

  const blocked = status !== "ready" || state.forming || state.holding;
  const Fold = state.folded ? UnfoldHorizontal : FoldHorizontal;

  return (
    <div className={styles.workbench} onKeyDown={key} aria-label={t.title}>
      <div className={styles.canvas} ref={host} tabIndex={0} role="region" aria-label={t.title} aria-describedby="paper-instructions" />
      <div className={styles.header}>
        <div className={styles.material}>
          <span>{t.material}</span>
          <small>{t.subtitle}</small>
        </div>
        <div className={styles.panelButtons}>
          <button type="button" aria-label={t.help} aria-expanded={panel === "help"} aria-controls="paper-help" onClick={() => setPanel(panel === "help" ? null : "help")}><CircleHelp size={18} /></button>
          <button type="button" aria-label={t.settings} aria-expanded={panel === "settings"} aria-controls="paper-settings" onClick={() => setPanel(panel === "settings" ? null : "settings")}><SlidersHorizontal size={18} /></button>
        </div>
      </div>

      {status !== "ready" && <div className={styles.loading} role="status">{status === "loading" ? t.loading : t.unavailable}</div>}
      {state.fallback && status === "ready" && <span className={styles.fallback}>{t.fallback}</span>}
      <div className={styles.view} role="group" aria-label={t.view}>
        <button type="button" onClick={() => setTool("grab")} aria-pressed={mode === "grab"} aria-label={t.grab} title={t.grab} disabled={status !== "ready"}><Hand size={17} /></button>
        <button type="button" onClick={() => setTool("view")} aria-pressed={mode === "view"} aria-label={t.look} title={t.look} disabled={status !== "ready"}><Move size={17} /></button>
        <button type="button" onClick={() => engine.current?.magnify(-.14)} aria-label={t.zoomIn} title={t.zoomIn} disabled={status !== "ready"}><Plus size={18} /></button>
        <button type="button" onClick={() => engine.current?.magnify(.14)} aria-label={t.zoomOut} title={t.zoomOut} disabled={status !== "ready"}><Minus size={18} /></button>
      </div>

      <div className={styles.footer}>
        <p id="paper-instructions" className={styles.instruction}>{mode === "grab" ? t.grabHint : t.viewHint}</p>
        <div className={styles.tools} role="group" aria-label={t.tools}>
          <button type="button" onClick={() => perform(state.folded ? "unfold" : "fold")} disabled={blocked}><Fold size={17} />{state.folded ? t.unfold : t.fold}</button>
          <button type="button" onClick={() => perform("crumple")} disabled={blocked}><span className={styles.ball} aria-hidden="true">◇</span>{t.crumple}</button>
          <button type="button" onClick={() => perform("smooth")} disabled={blocked}><ScanLine size={17} />{t.smooth}</button>
          <button type="button" onClick={() => perform("toss")} disabled={blocked}><Send size={17} />{t.toss}</button>
          <button type="button" onClick={() => perform("reset")} disabled={status !== "ready"}><RotateCcw size={17} />{t.reset}</button>
        </div>
      </div>
      <span className={styles.sr} role="status" aria-live="polite">{state.forming ? t.working : state.holding ? t.held : ""}</span>

      {panel === "settings" && <aside className={styles.panel} aria-label={t.settings} id="paper-settings">
        <div><h2>{t.settings}</h2><button type="button" aria-label={t.close} onClick={() => setPanel(null)}><X size={17} /></button></div>
        <label><span><Wind size={15} />{t.fan}</span><select value={fan} onChange={event => {
          const value = Number(event.target.value);
          setFan(value); engine.current?.fan(value);
        }}><option value={0}>{t.off}</option><option value={.48}>{t.breeze}</option><option value={1}>{t.strong}</option></select></label>
        <label><span>{t.axis}</span><select value={axis} onChange={event => setAxis(event.target.value as "long" | "short")}>
          <option value="long">{t.long}</option><option value="short">{t.short}</option>
        </select></label>
        <label><span>{t.graphics}</span><select value={quality} onChange={event => {
          const value = event.target.value as PaperQuality;
          setQuality(value); engine.current?.quality(value);
        }}><option value="auto">{t.auto}</option><option value="low">{t.low}</option><option value="high">{t.high}</option></select></label>
        <button type="button" className={styles.resetView} onClick={() => engine.current?.resetView()}><RotateCcw size={14} />{t.resetView}</button>
      </aside>}
      {panel === "help" && <aside className={styles.panel} aria-label={t.help} id="paper-help">
        <div><h2>{t.help}</h2><button type="button" aria-label={t.close} onClick={() => setPanel(null)}><X size={17} /></button></div>
        <p>{t.grabHint} {t.viewHint}</p>
        <p>{t.keyboard}</p>
        <p>{t.model}</p>
      </aside>}
    </div>
  );
}
