"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./use-in-view";

/**
 * Scroll-triggered entrance for a block. It has no hidden resting state (see `useScrollReveal`):
 * server HTML, no-JS, reduced motion, the first viewport and full-page captures always show it.
 */
export function Reveal({ children, delayMs = 0, className }: { children: ReactNode; delayMs?: number; className?: string }) {
  const ref = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
      className={cn("motion-js:data-[reveal=play]:animate-reveal", className)}
    >
      {children}
    </div>
  );
}
