"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: `#${string}`;
  className?: string;
  focusTarget?: boolean;
  children: ReactNode;
};

export function FragmentLink({ href, className, focusTarget, children }: Props) {
  return (
    <Link
      href={href}
      className={className}
      prefetch={false}
      onNavigate={() => {
        const destination = new URL(href, window.location.href);
        const target = document.getElementById(destination.hash.slice(1));
        // Next scrolls new fragment navigations but deliberately leaves focus alone.
        if (focusTarget) target?.focus({ preventScroll: true });
        if (destination.href === window.location.href) {
          // Next treats the same URL as a no-op. Repeated fragment links must
          // still scroll; CSS supplies smooth/auto behavior and reduced motion.
          target?.scrollIntoView({ behavior: "auto" });
        }
      }}
    >
      {children}
    </Link>
  );
}
