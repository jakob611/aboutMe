"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { enhanceReveal } from "@/lib/reveal-motion";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

/** Server HTML stays readable; motion is prepared only after hydration. */
export function Reveal({ children, className, delay = 0, y = 30 }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !element.animate || !("IntersectionObserver" in window))
      return;
    return enhanceReveal(
      element,
      { delay, y },
      {
        preference: window.matchMedia("(prefers-reduced-motion: reduce)"),
        viewportHeight: window.innerHeight,
        createObserver: (callback, options) =>
          new IntersectionObserver(callback, options),
      },
    );
  }, [delay, y]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
}
