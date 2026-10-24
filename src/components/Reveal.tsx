"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

/** Content is visible in the server HTML; animation is an optional enhancement. */
export function Reveal({ children, className, delay = 0, y = 24 }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (
      !element ||
      preference.matches ||
      !element.animate ||
      !("IntersectionObserver" in window)
    )
      return;
    let animation: Animation | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        animation = element.animate(
          [
            {
              opacity: 0,
              transform: `translateY(${Math.min(Math.max(y, 0), 32)}px)`,
            },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: 600,
            delay: Math.min(Math.max(delay, 0), 0.4) * 1000,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "backwards",
          },
        );
      },
      { threshold: 0.08 },
    );
    observer.observe(element);
    const reduceMotion = () => {
      if (!preference.matches) return;
      animation?.cancel();
      observer.disconnect();
    };
    preference.addEventListener("change", reduceMotion);
    return () => {
      observer.disconnect();
      animation?.cancel();
      preference.removeEventListener("change", reduceMotion);
    };
  }, [delay, y]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
}
