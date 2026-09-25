import { Mic } from "lucide-react";
import type { CSSProperties } from "react";
import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn, formatDuration } from "@/lib/utils";
import { DEMO, DEMO_FOCUS, PERSONA_ICON, RECEPTION_META } from "./landing-data";

const WAVE = [0.35, 0.6, 0.9, 0.5, 0.75, 1, 0.55, 0.8, 0.4, 0.7, 0.95, 0.5, 0.65, 0.3];

/** What the presenter actually said in the focus moment — the line every listener heard. */
const focusSection = DEMO.presentationMap?.sections.find((s) => s.id === DEMO_FOCUS.id);
const focusSegmentId = focusSection?.difficultSectionIds?.[0] ?? focusSection?.segmentIds?.[0];
const SAID = DEMO.transcript?.segments.find((s) => s.id === focusSegmentId)?.text ?? DEMO_FOCUS.summary;

/**
 * The one-time story, in order: ① the voice plays → ② three AI listeners branch out →
 * ③ each one reacts differently. Pure CSS on load (no JS needed); every step uses
 * `both` fill so the final frame is what stays, and reduced motion skips straight to it.
 */
/** Whole sequence settles by ~2.4s: last quote starts at 1700 + 2×160 + 100 ms and runs 220 ms. */
const STEP_MS = { voice: 0, said: 200, branch: 800, persona: 1050, reaction: 1700 } as const;
const at = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });
const once = "motion-reduce:animate-none";

function Step({ n, children, delay }: { n: number; children: string; delay: number }) {
  return (
    <p className={cn("animate-rise-in flex items-center justify-center gap-1.5 text-label-sm tracking-[0.12em] text-on-surface-variant", once)} style={at(delay)}>
      <span className="flex size-4 items-center justify-center rounded-full bg-on-surface text-[0.625rem] leading-none tracking-normal text-surface-bright">{n}</span>
      {children}
    </p>
  );
}

export function HeroVisual() {
  const listeners = DEMO_FOCUS.listeners;
  return (
    <figure aria-labelledby="hero-visual-caption" className="relative mx-auto w-full max-w-xl">
      <div className="flex flex-col items-center gap-3">
        <Step n={1} delay={STEP_MS.voice}>
          발표
        </Step>
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-inverse-surface text-inverse-on-surface sm:size-14">
            <Mic aria-hidden className="size-5 sm:size-6" />
          </span>
          <span aria-hidden className="flex h-8 items-center gap-1">
            {WAVE.map((h, i) => (
              <span
                key={i}
                className={cn("animate-speak w-1 origin-center rounded-full bg-on-surface", once)}
                style={{ height: `${h * 100}%`, ...at(i * 30) }}
              />
            ))}
          </span>
          <span className="text-label-md tabular-nums text-on-surface-variant">{formatDuration(DEMO_FOCUS.startSec)}</span>
        </div>
        <blockquote className={cn("animate-rise-in max-w-md text-center text-body-md text-on-surface line-clamp-2", once)} style={at(STEP_MS.said)}>
          “{SAID}”
        </blockquote>
      </div>

      <svg aria-hidden viewBox="0 0 300 56" preserveAspectRatio="none" className="mt-2 h-12 w-full text-outline sm:h-14">
        {[50, 150, 250].map((x, i) => (
          <path
            key={x}
            d={`M150 0 C150 28 ${x} 28 ${x} 56`}
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="1"
            className={cn("animate-draw", once)}
            style={at(STEP_MS.branch + i * 60)}
          />
        ))}
      </svg>

      <Step n={2} delay={STEP_MS.branch}>
        AI 관중 3명
      </Step>

      <ul className="mt-3 grid grid-cols-3 gap-2 sm:gap-4">
        {listeners.map((listener, i) => {
          const Icon = PERSONA_ICON[listener.kind];
          const reception = RECEPTION_META[listener.reception];
          const ReceptionIcon = reception.icon;
          return (
            <li key={listener.personaId} className="flex flex-col items-center gap-2 text-center">
              <span
                className={cn("animate-settle flex size-11 items-center justify-center rounded-full sm:size-14", PERSONA_STYLE[listener.kind].chip, once)}
                style={at(STEP_MS.persona + i * 120)}
              >
                <Icon aria-hidden className="size-5 sm:size-6" />
              </span>
              <span className={cn("animate-rise-in text-label-lg text-on-surface", once)} style={at(STEP_MS.persona + i * 120 + 80)}>
                {listener.name}
              </span>
              <span
                className={cn("animate-rise-in inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-md", reception.chip, once)}
                style={at(STEP_MS.reaction + i * 160)}
              >
                <ReceptionIcon aria-hidden className="size-3.5" />
                {reception.label}
              </span>
              {listener.evidence && (
                <span className={cn("animate-rise-in hidden text-body-sm text-on-surface-variant text-pretty sm:block", once)} style={at(STEP_MS.reaction + 100 + i * 160)}>
                  “{listener.evidence}”
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4">
        <Step n={3} delay={STEP_MS.reaction}>
          관중마다 다른 반응
        </Step>
      </div>
      <figcaption id="hero-visual-caption" className="mt-3 text-center text-label-md text-on-surface-variant">
        예시 · 같은 {formatDuration(DEMO_FOCUS.startSec)} ‘{DEMO_FOCUS.title}’ 구간을 들은 세 관중의 반응
      </figcaption>
    </figure>
  );
}
