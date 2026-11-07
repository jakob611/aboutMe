"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { RotateCcw, Undo2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { homeContentDefaults } from "@/lib/home-content-defaults";
import styles from "./BrickPlayground.module.css";

const colours = [
  { id: "clay", fill: "#b96f52" },
  { id: "moss", fill: "#708c70" },
  { id: "ochre", fill: "#c4a254" },
  { id: "blue", fill: "#6b8f9d" },
] as const;
type Board = number[][];
const startingBoard = (): Board => Array.from({ length: 16 }, (_, index) => index === 5 ? [1, 2] : index === 6 ? [0] : index === 9 ? [3] : []);

export function BrickPlayground({ lang, copy }: { lang: Lang; copy: Record<string, string> }) {
  const [board, setBoard] = useState<Board>(startingBoard);
  const [colour, setColour] = useState(0);
  const [history, setHistory] = useState<Board[]>([]);
  const id = useId();
  const t = (key: string) => copy[`playground.${key}`] ?? homeContentDefaults[lang][`playground.${key}`] ?? "";
  const count = board.reduce((total, cell) => total + cell.length, 0);
  function update(next: Board) { setHistory(previous => [...previous.slice(-39), board]); setBoard(next); }
  function place(index: number) { update(board.map((cell, position) => position !== index ? cell : cell.length === 3 ? [] : [...cell, colour])); }
  function activate(event: KeyboardEvent<SVGGElement>, index: number) {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); place(index); }
  }
  return <div className={styles.playground}>
    <div className={styles.topline}><span>{t("label")}</span><span aria-hidden="true">04 × 04</span></div>
    <svg viewBox="0 0 400 290" className={styles.scene} role="group" aria-labelledby={`${id}-title`} aria-describedby={`${id}-hint`}>
      <title id={`${id}-title`}>{t("title")}</title>
      <desc id={`${id}-hint`}>{t("instructions")}</desc>
      <path d="m200 58 154 77-154 77-154-77Z" fill="#c3bbab" />
      <path d="m46 135 154 77v10L46 145Zm154 77 154-77v10l-154 77Z" fill="#a49d8f" />
      {board.map((stack, index) => {
        const row = Math.floor(index / 4), column = index % 4;
        const action = stack.length === 3 ? t("remove") : t("add");
        return <g key={index} transform={`translate(${200 + (column - row) * 36} ${78 + (column + row) * 18})`} className={styles.cell} role="button" tabIndex={0} aria-label={`${t("row")} ${row + 1}, ${t("column")} ${column + 1}: ${stack.length}/3. ${action}`} onClick={() => place(index)} onKeyDown={event => activate(event, index)}>
          <path className={styles.tile} d="M0-17 33 0 0 17-33 0Z" />
          <ellipse cx="0" cy="0" rx="6" ry="3" fill="#a8a08f" opacity=".5" pointerEvents="none" />
          {stack.map((colourIndex, level) => <g key={level} transform={`translate(0 ${-13 * (level + 1)})`} pointerEvents="none">
            <g className={styles.brick}>
              <path d="M-33 0 0 17v13l-33-17Z" fill={colours[colourIndex].fill} />
              <path d="M0 17 33 0v13L0 30Z" fill={colours[colourIndex].fill} />
              <path d="M-33 0 0 17v13l-33-17Z" fill="#000" opacity=".2" />
              <path d="M0 17 33 0v13L0 30Z" fill="#000" opacity=".08" />
              <path d="M0-17 33 0 0 17-33 0Z" fill={colours[colourIndex].fill} stroke="#fff" strokeOpacity=".18" />
              <ellipse cx="-10" cy="-5" rx="6.5" ry="3.5" fill="#000" opacity=".15" />
              <ellipse cx="10" cy="5" rx="6.5" ry="3.5" fill="#000" opacity=".15" />
              <ellipse cx="-10" cy="-7" rx="6.5" ry="3.5" fill={colours[colourIndex].fill} stroke="#fff" strokeOpacity=".3" />
              <ellipse cx="10" cy="3" rx="6.5" ry="3.5" fill={colours[colourIndex].fill} stroke="#fff" strokeOpacity=".3" />
            </g>
          </g>)}
          <path className={styles.focusRing} d="M0-20 38 0 0 20-38 0Z" fill="none" pointerEvents="none" />
        </g>;
      })}
    </svg>
    <div className={styles.controls}>
      <div role="group" aria-label={t("colours")} className={styles.palette}>{colours.map((item, index) => <button type="button" key={item.id} aria-label={t(item.id)} aria-pressed={colour === index} onClick={() => setColour(index)}><span style={{ background: item.fill }} /></button>)}</div>
      <div className={styles.actions}><button type="button" disabled={!history.length} aria-label={t("undo")} title={t("undo")} onClick={() => { setBoard(history[history.length - 1]); setHistory(previous => previous.slice(0, -1)); }}><Undo2 size={17} /></button><button type="button" disabled={!count} aria-label={t("reset")} title={t("reset")} onClick={() => update(Array.from({ length: 16 }, () => []))}><RotateCcw size={16} /></button></div>
    </div>
    <p className={styles.hint}>{t("instructions")}</p>
    <p role="status" className={styles.count}>{t("count").replace("{count}", String(count))}</p>
    <noscript><p>{t("noScript")}</p></noscript>
  </div>;
}
