"use client";

import { motion, type Variant } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

const initial: Variant = { opacity: 0, y: 24 };
const animate: Variant = { opacity: 1, y: 0 };

/**
 * A reusable reveal-on-scroll wrapper. Uses framer-motion's whileInView
 * so children animate the first time they enter the viewport.
 */
export function Reveal({ children, className, delay = 0, y = 24 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
