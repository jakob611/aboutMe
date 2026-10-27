"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Braces, Blocks, Smartphone, Printer, Grid2X2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { createWorkshopRotation } from "./workshop-rotation";
import styles from "./WorkshopScene.module.css";
import { homeContentDefaults } from "@/lib/home-content-defaults";
import { workshopSlides, workshopSubjects, type WorkshopFilter, type WorkshopProject, type WorkshopSubject } from "@/lib/workshop-slides";

const subjects = workshopSubjects;
const icons = { web: Braces, android: Smartphone, lego: Blocks, "3d-printing": Printer };
const noProjects: WorkshopProject[] = [];

export function WorkshopScene({ lang, projects = noProjects, copy }: { lang: Lang; projects?: WorkshopProject[]; copy?: Record<string, string> }) {
  const [selection, setSelection] = useState<{filter: WorkshopFilter; index: number; previous: WorkshopSubject | null}>({filter: "all", index: 0, previous: null});
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const rotation = useRef<ReturnType<typeof createWorkshopRotation> | null>(null);
  const id = useId().replace(/:/g, "");
  const t = (key: string) => copy?.["workshop." + key] ?? homeContentDefaults[lang]["workshop." + key] ?? "";
  const slides = workshopSlides(projects, selection.filter);
  const project = slides.length ? slides[selection.index % slides.length] : undefined;
  const active = project?.subject ?? (selection.filter === "all" ? subjects[selection.index % subjects.length] : selection.filter);
  const previous = selection.previous;
  const href = project?.href ?? (selection.filter === "all" ? "/projects" : "/projects?category=" + active);
  const linkLabel = project ? t("project") + ": " + project.title : t("link") + ": " + t(active + ".label");
  useEffect(() => {
    if (!root.current) return;
    const controller = createWorkshopRotation(root.current, () => {
      setSelection(scene => {
        const current = workshopSlides(projects, scene.filter);
        const subject = current.length ? current[scene.index % current.length].subject : scene.filter === "all" ? subjects[scene.index % subjects.length] : scene.filter;
        return {...scene, index: scene.index + 1, previous: subject};
      });
    }, value => {
      setPaused(value);
      if (!value) setSelection(scene => scene.filter === "all" ? scene : {filter: "all", index: 0, previous: scene.filter});
    }, {
      preference: window.matchMedia("(prefers-reduced-motion: reduce)"),
      page: document, viewportHeight: window.innerHeight,
      setTimer: (callback, milliseconds) => setTimeout(callback, milliseconds),
      clearTimer: timer => clearTimeout(timer),
      createObserver: "IntersectionObserver" in window ? callback => new IntersectionObserver(callback, {threshold: 0.15}) : undefined,
    });
    rotation.current = controller;
    const resetCategory = (event: Event) => {
      const category = (event.target as Element | null)?.closest?.("[data-workshop-subject]");
      if (category && root.current?.contains(category)) return;
      setSelection(scene => scene.filter === "all" ? scene : {filter: "all", index: 0, previous: scene.filter});
    };
    document.addEventListener("click", resetCategory);
    return () => { controller.destroy(); rotation.current = null; document.removeEventListener("click", resetCategory); };
  }, [projects]);
  const selectSubject = (filter: WorkshopFilter) => {
    rotation.current?.setPaused(true);
    setSelection({filter, index: selection.filter === filter ? selection.index + 1 : 0, previous: active});
  };
  const layerState = (subject: WorkshopSubject) => subject === active ? "active" : subject === previous ? "previous" : "idle";
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
    <div ref={root} className={`sketchbook ${styles.book}`} onPointerMove={followPointer} onFocusCapture={() => rotation.current?.setPaused(true)}>
      <div className="sketchbook-topline">
        <span className="section-label">{t("label")}</span>
        <span className="sketchbook-counter" aria-hidden="true">
          {String((selection.index % (slides.length || (selection.filter === "all" ? subjects.length : 1))) + 1).padStart(2, "0")} / {String(slides.length || (selection.filter === "all" ? subjects.length : 1)).padStart(2, "0")}
        </span>
      </div>
      <Link href={href} aria-label={linkLabel} className={`sketchbook-art ${styles.artLink}`} data-subject={active}>
        {project?.image ? <img key={project.key} src={project.image.url} alt={project.image.caption || project.title} width={960} height={640} className={styles.projectImage} /> : <svg
          viewBox="0 0 520 350"
          fill="none"
          aria-hidden="true"
          className="sketchbook-svg"
        >
          <defs>
            <pattern
              id={`${id}-dots`}
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r=".8" fill="currentColor" opacity=".12" />
            </pattern>
            <linearGradient
              id={`${id}-pane`}
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
          <path fill={`url(#${id}-dots)`} d="M0 0h520v350H0z" />
          <path
            d="M55 300h410M260 30v290"
            stroke="currentColor"
            opacity=".07"
          />
          <g className={styles.layer} data-scene="web" data-state={layerState("web")}>
            <path
              className={styles.drawOutline}
              data-workshop-outline=""
              pathLength="1"
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
              className={styles.drawOutline}
              data-workshop-outline=""
              pathLength="1"
              d="m277 133 113-3-6 93-113 3Z"
              fill={`url(#${id}-pane)`}
              stroke="#576b61"
            />
            <path
              className={styles.drawOutline}
              data-workshop-outline=""
              pathLength="1"
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
          <g className={styles.layer} data-scene="android" data-state={layerState("android")}>
            <g transform="translate(186 34) rotate(8 76 140)">
              <rect
                className={styles.drawOutline}
                data-workshop-outline=""
                pathLength="1"
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
                fill={`url(#${id}-pane)`}
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
                className={styles.drawOutline}
                data-workshop-outline=""
                pathLength="1"
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
                className={styles.drawOutline}
                data-workshop-outline=""
                pathLength="1"
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
          <g className={styles.layer} data-scene="lego" data-state={layerState("lego")} strokeLinejoin="round">
            <ellipse
              cx="262"
              cy="282"
              rx="143"
              ry="19"
              fill="#050a07"
              opacity=".5"
            />
            <path
              className={styles.drawOutline}
              data-workshop-outline=""
              pathLength="1"
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
              className={styles.drawOutline}
              data-workshop-outline=""
              pathLength="1"
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
              className={styles.drawOutline}
              data-workshop-outline=""
              pathLength="1"
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
          <g className={styles.layer} data-scene="3d-printing" data-state={layerState("3d-printing")} strokeLinejoin="round" strokeLinecap="round">
            <ellipse cx="266" cy="305" rx="147" ry="15" fill="#070c09" opacity=".5" />
            <path className={styles.drawOutline} data-workshop-outline="" pathLength="1" d="M138 273V61h239v212M157 268V79h201v189" stroke="#758d7d" strokeWidth="7" />
            <path d="M138 61h239" stroke="#b5c8b4" strokeWidth="3" />
            <path d="M148 119h220" stroke="#51695b" strokeWidth="9" />
            <path d="M168 94v161m177-161v161" stroke="#a3b6a2" strokeWidth="2" />
            <rect x="225" y="104" width="57" height="38" rx="5" fill="#344b3e" stroke="#a1bca8" />
            <circle cx="240" cy="120" r="7" stroke="#829e8c" />
            <path d="M250 142h13l-4 12h-5Z" fill="#d4b88a" stroke="#e3cba7" />
            <path d="M256 154v27" stroke="#d4b88a" strokeWidth="1.5" strokeDasharray="3 4" />
            <path className={styles.drawOutline} data-workshop-outline="" pathLength="1" d="m139 264 181-18 63 35-181 21Z" fill="#384b40" stroke="#a0b59d" />
            <path d="m139 264 63 38v10l-63-38Zm63 38 181-21v10l-181 21Z" fill="#1e3025" stroke="#718c76" />
            <path d="m219 252 41-22 38 16-41 24Z" fill="#c2ae8a" stroke="#dfccaa" />
            <path d="m219 252 38 18v-62l-38-17Z" fill="#756b50" stroke="#b7a27d" />
            <path d="m257 270 41-24v-62l-41 24Z" fill="#9b8a68" stroke="#d0ba93" />
            <path d="m219 191 41-22 38 15-41 24Z" fill="#cbb894" stroke="#e2d1af" />
            <path d="m220 202 37 17 40-23m-77 18 37 17 40-23m-77 18 37 17 40-23m-77 18 37 17 40-23" stroke="#e2c89a" opacity=".45" />
            <path className={styles.drawOutline} data-workshop-outline="" pathLength="1" d="M248 104V74c0-27 45-37 73-19" stroke="#a3b7a3" strokeWidth="2" />
            <circle cx="388" cy="78" r="24" fill="#293d30" stroke="#8aa38e" />
            <circle cx="388" cy="78" r="8" fill="#131e16" stroke="#8aa38e" />
            <path d="M325 55c23 17 24 31 39 29" stroke="#a3b7a3" strokeWidth="2" />
            <path d="M96 137H75v100h36m291-69h32v74h-26" stroke="#b6a079" strokeDasharray="3 6" />
            <circle cx="75" cy="137" r="4" fill="#b6a079" />
            <circle cx="434" cy="242" r="4" fill="#b6a079" />
          </g>
          <path
            d="M24 25h15m-15 0v15m472-15h-15m15 0v15M24 325h15m-15 0v-15m472 15h-15m15 0v-15"
            stroke="#7a8d81"
            opacity=".5"
          />
        </svg>}
      </Link>
      <div className={`sketchbook-switch ${styles.switcher}`} role="group" aria-label={t("hint")}>
        <button type="button" data-workshop-subject="all" aria-pressed={selection.filter === "all"} onClick={() => selectSubject("all")}><Grid2X2 size={15} aria-hidden="true" />{t("latest")}</button>
        {subjects.map((subject) => {
          const Icon = icons[subject];
          return (
            <button
              key={subject}
              type="button"
              data-workshop-subject={subject}
              aria-pressed={selection.filter === subject}
              onClick={() => selectSubject(subject)}
            >
              <Icon size={15} aria-hidden="true" />
              {t(subject + ".label")}
            </button>
          );
        })}
      </div>
      <div className={styles.rotationControls}>
        <span className={styles.motionHint}>{paused ? t("manual") : t("automatic")}</span>
        <span className={styles.reducedHint}>{t("reduced")}</span>
      </div>
      {project && <p className={styles.imageCaption}>{project.image?.caption || ""}</p>}
      <div className={"sketchbook-caption " + styles.captions}>
        {slides.length ? slides.map((slide, index) => <div key={slide.key} className={styles.caption} data-state={index === selection.index % slides.length ? "active" : "idle"} aria-hidden={index !== selection.index % slides.length}>
          <h2>{slide.title}</h2><p className={styles.summary}>{slide.summary}</p>
        </div>) : subjects.map(subject => <div key={subject} className={styles.caption} data-state={layerState(subject)} aria-hidden={subject !== active}>
          <h2>{t(subject + ".title")}</h2><p>{t(subject + ".description")}</p>
        </div>)}
      </div>
      <div className={styles.actions}>
        <Link href={href} className="sketchbook-link" aria-label={linkLabel}>{project ? t("project") : t("link")}<ArrowUpRight size={16} /></Link>
        {project?.linkUrl && <a href={project.linkUrl} target="_blank" rel="noreferrer" className="sketchbook-link">{t("visit")}<ArrowUpRight size={14} /></a>}
        {project?.repoUrl && !project.closed && <a href={project.repoUrl} target="_blank" rel="noreferrer" className="sketchbook-link">{t("code")}<ArrowUpRight size={14} /></a>}
        {project?.closed && <span className={styles.closed}>{t("closed")}</span>}
      </div>
    </div>
  );
}
