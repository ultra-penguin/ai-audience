"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "./use-in-view";

/**
 * Scroll-triggered entrance for a block. The hidden "before" state exists only under
 * `motion-js:` (scripts on + motion allowed), so server HTML, no-JS and reduced-motion
 * visitors always see the content.
 */
export function Reveal({ children, delayMs = 0, className }: { children: ReactNode; delayMs?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.01, "0px 0px -8% 0px");
  return (
    <div
      ref={ref}
      data-inview={inView || undefined}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={cn(
        "motion-js:transition-[opacity,translate] motion-js:duration-700 motion-js:ease-out",
        "motion-js:not-data-inview:translate-y-4 motion-js:not-data-inview:opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
