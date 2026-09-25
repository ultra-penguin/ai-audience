"use client";

import { useState } from "react";
import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn, formatDuration } from "@/lib/utils";
import { DEMO, DEMO_MOMENTS, PERSONA_ICON, RECEPTION_META } from "./landing-data";
import { defaultMomentIndex, momentSummary } from "./motion-demo";
import { SectionIntro } from "./section-intro";
import { useScrollReveal } from "./use-in-view";

const END_SEC = Math.max(DEMO.durationSec, ...DEMO_MOMENTS.map((m) => m.endSec));
const pct = (sec: number) => (sec / END_SEC) * 100;

/** Section 07: the talk's timeline; selecting a point shows each listener's reaction there. */
export function AnalysisTimeline() {
  const [selected, setSelected] = useState(() => defaultMomentIndex(DEMO_MOMENTS));
  const ref = useScrollReveal<HTMLDivElement>();
  const moment = DEMO_MOMENTS[selected];

  return (
    <section aria-labelledby="timeline-title" className="space-y-8 border-t border-outline-variant/60 py-14 md:py-20">
      <SectionIntro id="timeline-title" eyebrow="분석 타임라인" title="반응은 발표의 특정 순간에 연결됩니다.">
        발표 시간 위의 한 지점을 고르면, 그 순간 세 관중이 각각 어떻게 들었는지 볼 수 있어요.
      </SectionIntro>

      <div ref={ref} className="group/tl space-y-5">
        {/* The axis draws once, left to right; the marker glides to the selected moment. Decorative — the buttons below carry the meaning. */}
        <div aria-hidden className="relative px-6 pt-7">
          <div className="relative h-2">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-outline-variant" />
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 origin-left bg-on-surface motion-js:group-data-[reveal=play]/tl:animate-grow-x" />
            {DEMO_MOMENTS.map((m, i) => (
              <span
                key={m.id}
                className={cn(
                  "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-background transition-colors",
                  i === selected ? "bg-primary" : m.wavered > 0 ? "bg-on-surface" : "bg-outline",
                )}
                style={{ left: `${pct(m.startSec)}%` }}
              />
            ))}
            {/* Full-width layer translated by the moment's %, so the marker moves on transform alone. */}
            {/* The clip box leaves room for the label at either end without widening the page. */}
            <div className="absolute -inset-x-6 -top-7 bottom-0 overflow-hidden">
              <div className="absolute inset-y-0 left-6 right-6 transition-transform duration-500 ease-out" style={{ transform: `translateX(${moment ? pct(moment.startSec) : 0}%)` }}>
                <span className="absolute top-0 left-0 -translate-x-1/2 rounded-sm bg-primary px-1.5 py-0.5 text-label-sm tabular-nums text-on-primary">
                  {moment ? formatDuration(moment.startSec) : ""}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-label-sm tabular-nums text-on-surface-variant">
            <span>0:00</span>
            <span>{formatDuration(END_SEC)}</span>
          </div>
        </div>

        <div data-testid="timeline-points" role="group" aria-label="발표 구간 선택" className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {DEMO_MOMENTS.map((m, i) => {
            const isSelected = i === selected;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelected(i)}
                className={cn(
                  "flex min-h-11 flex-col items-start gap-1 rounded-xl p-3 text-left transition-colors sm:p-4",
                  isSelected ? "bg-inverse-surface text-inverse-on-surface" : "text-on-surface ring-1 ring-outline-variant/70 hover:bg-surface-container-lowest",
                )}
              >
                <span className={cn("text-label-md tabular-nums", isSelected ? "text-inverse-on-surface/80" : "text-on-surface-variant")}>
                  {formatDuration(m.startSec)} – {formatDuration(m.endSec)}
                </span>
                <span className="text-label-lg">{m.title}</span>
                <span className={cn("text-label-md", isSelected ? "text-inverse-on-surface/80" : "text-on-surface-variant")}>
                  {m.wavered > 0 ? `${m.wavered}명 흔들림` : "모두 따라옴"}
                </span>
              </button>
            );
          })}
        </div>

        <div data-testid="timeline-detail" aria-live="polite" className="rounded-xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/70 sm:p-6">
          {moment && (
            <div key={moment.id} className="animate-rise-in space-y-5 motion-reduce:animate-none">
              <div className="space-y-2">
                <p className="text-label-md tabular-nums text-on-surface-variant">
                  <span className="mr-1.5 rounded-sm bg-surface-container px-1.5 py-0.5 text-label-sm text-on-surface">DEMO · 예시</span>
                  {formatDuration(moment.startSec)} – {formatDuration(moment.endSec)} · {moment.title}
                </p>
                <p className="text-headline-md text-on-surface text-pretty">{momentSummary(moment)}</p>
                {moment.summary && <p className="text-body-md text-on-surface-variant">발표 내용 · {moment.summary}</p>}
              </div>
              <ul className="grid gap-4 border-t border-outline-variant/70 pt-5 md:grid-cols-3 md:gap-6">
                {moment.listeners.map((l) => {
                  const Icon = PERSONA_ICON[l.kind];
                  const meta = RECEPTION_META[l.reception];
                  const StateIcon = meta.icon;
                  return (
                    <li key={l.personaId} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("flex size-8 items-center justify-center rounded-full", PERSONA_STYLE[l.kind].chip)}>
                          <Icon aria-hidden className="size-4" />
                        </span>
                        <span className="text-label-lg text-on-surface">{l.name}</span>
                      </div>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-md", meta.chip)}>
                        <StateIcon aria-hidden className="size-3.5" />
                        {meta.label}
                      </span>
                      {l.evidence && <p className="text-body-md text-on-surface">“{l.evidence}”</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
