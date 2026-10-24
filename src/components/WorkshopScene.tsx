"use client";

import { useState, type PointerEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Braces, Blocks, Smartphone } from "lucide-react";
import type { Lang } from "@/lib/i18n";

const subjects = ["web", "android", "lego"] as const;
type Subject = (typeof subjects)[number];
const icons = { web: Braces, android: Smartphone, lego: Blocks };
const copy = {
  en: {
    label: "The sketchbook",
    hint: "Pick something to explore",
    link: "Explore the projects",
    web: [
      "Web",
      "A clear idea. A useful interface.",
      "From the first wireframe to the small details that make a page feel right.",
    ],
    android: [
      "Android",
      "Small screens. Real possibilities.",
      "Exploring how an idea becomes something you can carry in your pocket.",
    ],
    lego: [
      "LEGO",
      "Thinking with my hands.",
      "Another way to build: one piece, one adjustment, one new possibility at a time.",
    ],
  },
  sl: {
    label: "Skicirka",
    hint: "Izberi, kaj te zanima",
    link: "Razišči projekte",
    web: [
      "Splet",
      "Jasna ideja. Uporaben vmesnik.",
      "Od prve skice do drobnih podrobnosti, zaradi katerih stran deluje premišljeno.",
    ],
    android: [
      "Android",
      "Majhen zaslon. Veliko možnosti.",
      "Raziskujem, kako ideja postane nekaj, kar lahko nosiš v žepu.",
    ],
    lego: [
      "LEGO",
      "Razmišljanje z rokami.",
      "Drugačen način ustvarjanja: kos za kosom, popravek za popravkom, do nove možnosti.",
    ],
  },
};

export function WorkshopScene({ lang }: { lang: Lang }) {
  const [active, setActive] = useState<Subject>("web");
  const t = copy[lang];
  const followPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--spot-x",
      event.clientX - rect.left + "px",
    );
    event.currentTarget.style.setProperty(
      "--spot-y",
      event.clientY - rect.top + "px",
    );
  };

  return (
    <div className="sketchbook" onPointerMove={followPointer}>
      <div className="sketchbook-topline">
        <span className="section-label">{t.label}</span>
        <span className="sketchbook-counter" aria-hidden="true">
          0{subjects.indexOf(active) + 1} / 03
        </span>
      </div>
      <div className="sketchbook-art" data-subject={active}>
        <svg
          viewBox="0 0 520 350"
          fill="none"
          aria-hidden="true"
          className="sketchbook-svg"
        >
          <defs>
            <pattern
              id="sketch-dots"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r=".8" fill="currentColor" opacity=".12" />
            </pattern>
            <linearGradient
              id="sketch-pane"
              x1="100"
              y1="30"
              x2="420"
              y2="320"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#252d2c" />
              <stop offset="1" stopColor="#171c1c" />
            </linearGradient>
          </defs>
          <path fill="url(#sketch-dots)" d="M0 0h520v350H0z" />
          <path
            d="M55 300h410M260 30v290"
            stroke="currentColor"
            opacity=".07"
          />
          <g className="sketch-layer sketch-web">
            <path
              d="m99 76 329-8-12 210-329 8Z"
              fill="#0b0e0e"
              stroke="#61736e"
              strokeWidth="1.4"
            />
            <path d="m99 76 329-8-2 33-329 8Z" fill="#242c29" />
            <circle cx="113" cy="91" r="3" fill="#bda77e" />
            <circle cx="125" cy="91" r="3" fill="#94aaa0" />
            <circle cx="137" cy="90" r="3" fill="#67776c" />
            <path
              d="m163 90 181-4"
              stroke="#64736d"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="m118 137 101-2m-102 12 73-2"
              stroke="#e6e3d8"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="m117 166 122-3m-122 11 102-2"
              stroke="#707d76"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="m116 205 65-2-1 19-65 2Z" fill="#9cc8b9" />
            <path
              d="m277 133 113-3-6 93-113 3Z"
              fill="url(#sketch-pane)"
              stroke="#576b61"
            />
            <path
              d="m281 202 23-21 20 8 25-37 29 27"
              stroke="#a8c9b5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="m112 252 84-2m24 0 83-2m24 0 60-2"
              stroke="#4b5c52"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              className="sketch-trace"
              d="M73 184H50v-64h27M439 168h28v62h-29"
              stroke="#c1aa80"
              strokeWidth="1.5"
              strokeDasharray="3 6"
            />
            <circle cx="50" cy="184" r="4" fill="#c1aa80" />
            <circle cx="467" cy="168" r="4" fill="#c1aa80" />
          </g>
          <g className="sketch-layer sketch-android">
            <g transform="translate(186 34) rotate(8 76 140)">
              <rect
                width="153"
                height="282"
                rx="25"
                fill="#0c1010"
                stroke="#72867c"
                strokeWidth="1.5"
              />
              <rect
                x="9"
                y="9"
                width="135"
                height="264"
                rx="18"
                fill="url(#sketch-pane)"
              />
              <path
                d="M54 16h45"
                stroke="#0b0f0d"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <circle cx="33" cy="51" r="11" stroke="#a7bcad" />
              <path d="M29 51h8m-4-4v8" stroke="#a7bcad" />
              <path
                d="M22 88h86m-86 13h59"
                stroke="#e6e3d8"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <rect
                x="21"
                y="123"
                width="111"
                height="75"
                rx="7"
                fill="#34483d"
              />
              <path
                d="M32 181v-12m15 12v-24m15 24v-18m15 18v-39m15 39v-29m15 29v-45m15 45v-34"
                stroke="#b6cda9"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M23 218h74m-74 12h99"
                stroke="#76877b"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M57 257h39"
                stroke="#899a8e"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
            <path
              className="sketch-trace"
              d="M134 116h-32v74h38m234-9h36V99h-34"
              stroke="#a89dc0"
              strokeWidth="1.5"
              strokeDasharray="3 6"
            />
            <circle cx="103" cy="116" r="4" fill="#a89dc0" />
            <circle cx="410" cy="181" r="4" fill="#a89dc0" />
          </g>
          <g className="sketch-layer sketch-lego" strokeLinejoin="round">
            <ellipse
              cx="262"
              cy="282"
              rx="143"
              ry="19"
              fill="#050a07"
              opacity=".5"
            />
            <path
              d="m114 212 125-67 154 64-125 70Z"
              fill="#a99571"
              stroke="#d4c29d"
            />
            <path
              d="m114 212 154 67v35l-154-67Z"
              fill="#4a4939"
              stroke="#8d8264"
            />
            <path
              d="m268 279 125-70v35l-125 70Z"
              fill="#6b6850"
              stroke="#9c9273"
            />
            <path
              d="m149 157 93-50 111 46-93 52Z"
              fill="#85a891"
              stroke="#b8ccad"
            />
            <path
              d="m149 157 111 48v43l-111-48Z"
              fill="#354e40"
              stroke="#6f8b72"
            />
            <path
              d="m260 205 93-52v43l-93 52Z"
              fill="#526e57"
              stroke="#8aa787"
            />
            <path
              d="m208 98 60-33 75 31-60 34Z"
              fill="#b1a8c8"
              stroke="#d7cde7"
            />
            <path
              d="m208 98 75 32v35l-75-32Z"
              fill="#514b65"
              stroke="#9485ad"
            />
            <path
              d="m283 130 60-34v35l-60 34Z"
              fill="#72647e"
              stroke="#b3a0c0"
            />
            <g fill="#b9caad" stroke="#6d8d70">
              <ellipse cx="190" cy="149" rx="16" ry="7" />
              <ellipse cx="231" cy="167" rx="16" ry="7" />
              <ellipse cx="230" cy="127" rx="16" ry="7" />
              <ellipse cx="271" cy="145" rx="16" ry="7" />
              <ellipse cx="271" cy="105" rx="16" ry="7" />
              <ellipse cx="312" cy="123" rx="16" ry="7" />
            </g>
            <g fill="#d0c5df" stroke="#9585aa">
              <ellipse cx="251" cy="89" rx="16" ry="7" />
              <ellipse cx="294" cy="106" rx="16" ry="7" />
            </g>
            <path
              className="sketch-trace"
              d="M121 133H80v86m324-59h31v79"
              stroke="#a4bba8"
              strokeDasharray="3 6"
            />
            <circle cx="80" cy="219" r="4" fill="#a4bba8" />
            <circle cx="435" cy="160" r="4" fill="#a4bba8" />
          </g>
          <path
            d="M24 25h15m-15 0v15m472-15h-15m15 0v15M24 325h15m-15 0v-15m472 15h-15m15 0v-15"
            stroke="#7a8d81"
            opacity=".5"
          />
        </svg>
      </div>
      <div className="sketchbook-switch" role="group" aria-label={t.hint}>
        {subjects.map((subject) => {
          const Icon = icons[subject];
          return (
            <button
              key={subject}
              type="button"
              aria-pressed={subject === active}
              onClick={() => setActive(subject)}
            >
              <Icon size={15} />
              {t[subject][0]}
            </button>
          );
        })}
      </div>
      <div className="sketchbook-caption" aria-live="polite" aria-atomic="true">
        <h2>{t[active][1]}</h2>
        <p>{t[active][2]}</p>
      </div>
      <Link href={"/projects?category=" + active} className="sketchbook-link">
        {t.link}
        <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
