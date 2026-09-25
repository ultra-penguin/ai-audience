"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollReveal } from "./use-in-view";

const COUNT_MS = 1200;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * A research number shown with its context. Server HTML and reduced-motion
 * users must always see the final value; the number never appears without its context line.
 * It counts up only when it scrolls in from below — if it is already on screen it just stays final.
 */
export function EvidenceMetric({ value, decimals = 1, suffix = "%", context }: { value: number; decimals?: number; suffix?: string; context: string }) {
  // null = show the final value (server render, reduced motion, already on screen, finished count).
  const [current, setCurrent] = useState<number | null>(null);
  const frame = useRef(0);

  const ref = useScrollReveal<HTMLDivElement>(() => {
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / COUNT_MS);
      setCurrent(t < 1 ? value * easeOut(t) : null);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, "0%");
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const final = `${value.toFixed(decimals)}${suffix}`;
  return (
    <div ref={ref} className="space-y-2">
      <p className="text-[3rem] font-semibold leading-none tracking-[-0.04em] text-on-surface tabular-nums sm:text-[3.5rem]">
        <span aria-hidden>{current === null ? final : `${current.toFixed(decimals)}${suffix}`}</span>
        <span className="sr-only">{final}</span>
      </p>
      <p className="text-body-md text-on-surface-variant">{context}</p>
    </div>
  );
}
