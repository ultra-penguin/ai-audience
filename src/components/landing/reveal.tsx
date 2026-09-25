// CONTRACT STUB — owned by Worker B (motion). Worker A may wrap content in <Reveal>; keep this API.
import type { ReactNode } from "react";

/** Scroll-triggered entrance for a block. Must render children visibly without JS and under reduced motion. */
export function Reveal({ children, delayMs = 0, className }: { children: ReactNode; delayMs?: number; className?: string }) {
  void delayMs;
  return <div className={className}>{children}</div>;
}
