"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion, useInView } from "./use-in-view";

const COUNT_MS = 1200;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * A research number shown with its context. Server HTML and reduced-motion
 * users must always see the final value; the number never appears without its context line.
 */
export function EvidenceMetric({ value, decimals = 1, suffix = "%", context }: { value: number; decimals?: number; suffix?: string; context: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.5);
  // null = show the final value (server render, reduced motion, finished count).
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / COUNT_MS);
      setCurrent(t < 1 ? value * easeOut(t) : null);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  const final = `${value.toFixed(decimals)}${suffix}`;
  return (
    <div
      ref={ref}
      data-inview={inView || undefined}
      className={cn(
        "space-y-2",
        "motion-js:transition-opacity motion-js:duration-500 motion-js:ease-out motion-js:not-data-inview:opacity-0",
      )}
    >
      <p className="text-[3rem] font-semibold leading-none tracking-[-0.04em] text-on-surface tabular-nums sm:text-[3.5rem]">
        <span aria-hidden>{current === null ? final : `${current.toFixed(decimals)}${suffix}`}</span>
        <span className="sr-only">{final}</span>
      </p>
      <p className="text-body-md text-on-surface-variant">{context}</p>
    </div>
  );
}
