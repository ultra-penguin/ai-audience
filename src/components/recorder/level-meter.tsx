import { cn } from "@/lib/utils";

const BARS = 20;
// Fixed per-bar weights give the meter a waveform-like silhouette without randomness.
const WEIGHTS = Array.from({ length: BARS }, (_, i) => 0.45 + 0.55 * Math.sin(((i + 1) / (BARS + 1)) * Math.PI));

/** Microphone input check. Decorative for AT; status text carries the meaning. */
export function LevelMeter({ level, active }: { level: number; active: boolean }) {
  return (
    <div aria-hidden className="flex h-12 items-center justify-center gap-1">
      {WEIGHTS.map((w, i) => {
        const h = active ? Math.max(0.12, Math.min(1, level * w * 1.6)) : 0.12;
        return (
          <span
            key={i}
            className={cn(
              "h-full w-1.5 origin-bottom rounded-full transition-transform duration-100",
              active ? (i % 3 === 1 ? "bg-secondary" : "bg-primary-container") : "bg-surface-container-highest",
            )}
            style={{ transform: `scaleY(${h})` }}
          />
        );
      })}
    </div>
  );
}
