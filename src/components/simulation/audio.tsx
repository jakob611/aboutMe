"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type PaperEffect = "grab" | "crease" | "crumple" | "land";
type Mode = "world" | "paper";
type FieldAudio = {
  surf(distanceMetres: number, bearing?: number, agitation?: number): void;
  paper(effect: PaperEffect, strength?: number): void;
};
const silent: FieldAudio = { surf() {}, paper() {} };
const AudioField = createContext(silent);
const base = "/simulation/audio";
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export function useSimulationAudio() { return useContext(AudioField); }

class Soundscape {
  private abort = new AbortController();
  private master: GainNode;
  private surfGain?: GainNode;
  private surfFilter?: BiquadFilterNode;
  private surfPan?: StereoPannerNode;
  private loop?: AudioBufferSourceNode;
  private effects?: Record<PaperEffect, AudioBuffer>;
  private heardAt = -1;
  private shoreAt = -1;
  private shut = false;

  constructor(private ctx: AudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = document.hidden ? 0 : .82;
    this.master.connect(ctx.destination);
  }

  private async load(name: string) {
    const response = await fetch(`${base}/${name}.mp3`, { signal: this.abort.signal });
    if (!response.ok) throw new Error("Sound unavailable");
    return this.ctx.decodeAudioData(await response.arrayBuffer());
  }

  async start(mode: Mode) {
    await this.ctx.resume();
    if (this.shut) return;
    if (mode === "paper") {
      const [grab, crease, crumple, land] = await Promise.all(["lift", "fold", "crumple", "land"].map(name => this.load(name)));
      if (!this.shut) this.effects = { grab, crease, crumple, land };
      return;
    }
    const buffer = await this.load("mediterranean-surf");
    if (this.shut) return;
    const source = this.ctx.createBufferSource(), volume = this.ctx.createGain(), filter = this.ctx.createBiquadFilter();
    source.buffer = buffer; source.loop = true;
    filter.type = "lowpass"; filter.frequency.value = 3800; filter.Q.value = .23;
    volume.gain.value = .33;
    source.connect(filter); filter.connect(volume);
    if (typeof this.ctx.createStereoPanner === "function") {
      this.surfPan = this.ctx.createStereoPanner();
      volume.connect(this.surfPan); this.surfPan.connect(this.master);
    } else volume.connect(this.master);
    this.loop = source; this.surfGain = volume; this.surfFilter = filter;
    source.start();
  }

  visible() {
    if (!this.shut) this.master.gain.setTargetAtTime(document.hidden ? 0 : .82, this.ctx.currentTime, .065);
  }

  surf(distance: number, bearing = 0, agitation = .5) {
    if (!this.surfGain || !this.surfFilter || this.shut || !Number.isFinite(distance)) return;
    const at = this.ctx.currentTime;
    if (at - this.shoreAt < .10) return;
    this.shoreAt = at;
    const d = Math.max(0, distance);
    const near = 1 / (1 + (d / 13) ** .9);
    this.surfGain.gain.setTargetAtTime((.08 + .63 * near) * (.66 + .42 * clamp(agitation, 0, 1)), at, .25);
    this.surfFilter.frequency.setTargetAtTime(850 + near * 5800, at, .30);
    if (Number.isFinite(bearing)) this.surfPan?.pan.setTargetAtTime(clamp(bearing, -1, 1) * .38, at, .22);
  }

  paper(effect: PaperEffect, strength = .5) {
    const buffer = this.effects?.[effect], at = this.ctx.currentTime;
    if (!buffer || this.shut || document.hidden || at - this.heardAt < .10) return;
    this.heardAt = at;
    const source = this.ctx.createBufferSource(), gain = this.ctx.createGain();
    source.buffer = buffer; source.playbackRate.value = .94 + Math.random() * .12;
    gain.gain.value = (.23 + .57 * clamp(strength, 0, 1)) * (effect === "land" ? .65 : .9);
    source.connect(gain); gain.connect(this.master);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start();
  }

  close() {
    if (this.shut) return;
    this.shut = true; this.abort.abort(); this.loop?.stop(); this.master.disconnect();
    void this.ctx.close().catch(() => {});
  }
}

export function useSoundscape(mode: Mode) {
  const field = useRef<Soundscape | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const onVisible = () => field.current?.visible();
    document.addEventListener("visibilitychange", onVisible);
    return () => { document.removeEventListener("visibilitychange", onVisible); field.current?.close(); field.current = null; };
  }, []);
  const toggle = useCallback(() => {
    if (field.current) { field.current.close(); field.current = null; setEnabled(false); return; }
    setUnavailable(false);
    try {
      const webkit = (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const context = new (window.AudioContext ?? webkit!)();
      const scene = new Soundscape(context);
      field.current = scene; setEnabled(true);
      void scene.start(mode).catch(() => {
        if (scene !== field.current) return;
        scene.close(); field.current = null; setEnabled(false); setUnavailable(true);
      });
    } catch { setUnavailable(true); }
  }, [mode]);
  const value = useMemo<FieldAudio>(() => ({
    surf(distance, bearing, agitation) { field.current?.surf(distance, bearing, agitation); },
    paper(effect, strength) { field.current?.paper(effect, strength); },
  }), []);
  return { enabled, unavailable, toggle, value };
}

export function SimulationAudioProvider({ value, children }: { value: FieldAudio; children: ReactNode }) {
  return <AudioField.Provider value={value}>{children}</AudioField.Provider>;
}
