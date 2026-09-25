"use client";

import { Check, CircleAlert, Mic } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn, formatDurationLong } from "@/lib/utils";
import { DEMO, PERSONA_ICON, RECEPTION_META } from "./landing-data";
import { UNDERSTANDING_RECEPTION } from "./motion-demo";
import { SectionIntro } from "./section-intro";
import { useInView } from "./use-in-view";

const WAVE = [0.4, 0.7, 0.5, 0.9, 0.6, 1, 0.45, 0.8, 0.55, 0.35];

const LISTENERS = DEMO.personas.flatMap((persona) => {
  const feedback = DEMO.personaFeedback.find((f) => f.personaId === persona.id);
  return feedback ? [{ persona, feedback, reception: UNDERSTANDING_RECEPTION[feedback.understanding] }] : [];
});

/** Section 06: one presentation reaching several listeners at once; selecting a listener shows their reaction. */
export function PersonaSimulation() {
  const baseId = useId();
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { ref, inView } = useInView<HTMLDivElement>(0.35);

  const select = (i: number) => {
    const next = (i + LISTENERS.length) % LISTENERS.length;
    setSelected(next);
    tabRefs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowRight: selected + 1,
      ArrowDown: selected + 1,
      ArrowLeft: selected - 1,
      ArrowUp: selected - 1,
      Home: 0,
      End: LISTENERS.length - 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(moves[e.key]!);
  };

  const current = LISTENERS[selected];
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = `${baseId}-panel`;

  return (
    <section aria-labelledby="simulation-title" className="space-y-10 border-t border-outline-variant/60 py-16 md:py-24">
      <SectionIntro id="simulation-title" eyebrow="시뮬레이션" title="하나의 발표가, 세 관중에게 동시에 닿습니다.">
        같은 말을 들어도 받아들이는 것은 다릅니다. 관중을 골라 그 관중의 반응을 들어보세요.
      </SectionIntro>

      <div
        ref={ref}
        data-inview={inView || undefined}
        className="group/sim grid gap-4 lg:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] lg:gap-0"
      >
        {/* The presentation — a single source. */}
        <div className="self-center rounded-xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/70 sm:p-6">
          <p className="flex items-center gap-2 text-label-md text-on-surface-variant">
            <span className="rounded-sm bg-surface-container px-1.5 py-0.5 text-label-sm text-on-surface">DEMO · 예시</span>
            발표 {formatDurationLong(DEMO.durationSec)}
          </p>
          <p className="mt-3 text-headline-md text-on-surface text-pretty">{DEMO.title}</p>
          <div className="mt-5 flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-inverse-surface text-inverse-on-surface">
              <Mic aria-hidden className="size-4" />
            </span>
            <span aria-hidden className="flex h-7 flex-1 items-center gap-1">
              {WAVE.map((h, i) => (
                <span key={i} className="w-1 rounded-full bg-on-surface/70" style={{ height: `${h * 100}%` }} />
              ))}
            </span>
          </div>
        </div>

        {/* One source → three listeners, drawn at the same instant (a transform-only wipe uncovers the lines). */}
        <div aria-hidden className="relative hidden overflow-hidden lg:block">
          <svg viewBox="0 0 80 300" preserveAspectRatio="none" className="absolute inset-0 size-full text-outline">
            {[50, 150, 250].map((y) => (
              <path key={y} d={`M0 150 C40 150 40 ${y} 80 ${y}`} fill="none" stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          <span className="absolute inset-0 hidden bg-background motion-js:block motion-js:transition-transform motion-js:duration-700 motion-js:ease-out motion-js:group-data-inview/sim:translate-x-full" />
        </div>
        <p aria-hidden className="text-center text-label-md text-on-surface-variant lg:hidden">
          ↓ 같은 발표를 동시에 들어요
        </p>

        <div
          role="tablist"
          aria-label="AI 관중 선택"
          onKeyDown={onKeyDown}
          className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:grid-rows-3"
        >
          {LISTENERS.map(({ persona, reception }, i) => {
            const Icon = PERSONA_ICON[persona.kind];
            const meta = RECEPTION_META[reception];
            const StateIcon = meta.icon;
            const isSelected = i === selected;
            return (
              <button
                key={persona.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                id={tabId(i)}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={panelId}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setSelected(i)}
                className={cn(
                  "flex min-h-11 flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors lg:flex-row lg:gap-3 lg:p-4 lg:text-left",
                  isSelected ? "bg-surface-container-lowest ring-2 ring-on-surface" : "ring-1 ring-outline-variant/70 hover:bg-surface-container-lowest/70",
                )}
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", PERSONA_STYLE[persona.kind].chip)}>
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="text-label-lg text-on-surface lg:flex-1">{persona.name}</span>
                {/* Every listener reacts at the same moment — one shared delay, not a stagger. */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-md",
                    meta.chip,
                    "motion-js:transition-[opacity,translate] motion-js:delay-500 motion-js:duration-500 motion-js:ease-out",
                    "motion-js:group-not-data-inview/sim:translate-y-1 motion-js:group-not-data-inview/sim:opacity-0",
                  )}
                >
                  <StateIcon aria-hidden className="size-3.5" />
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {current && (
        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={tabId(selected)}
          tabIndex={0}
          className="rounded-xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/70 sm:p-8"
        >
          <div key={current.persona.id} className="animate-rise-in grid gap-6 motion-reduce:animate-none md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-10">
            <div className="space-y-4">
              <p className="text-label-md text-on-surface-variant">
                {current.persona.name} · {current.persona.description}
              </p>
              <blockquote className="text-headline-md text-on-surface text-pretty">“{current.feedback.reaction}”</blockquote>
              <p className="text-body-md text-on-surface-variant">
                <span className="text-label-md text-on-surface">이 관중이 듣는 것 · </span>
                {current.persona.listensFor}
              </p>
            </div>
            <div className="space-y-5 border-t border-outline-variant/70 pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <ReactionList title="받아들인 것" items={current.feedback.whatLanded} icon={Check} tone="text-secondary" />
              <ReactionList title="놓친 곳" items={current.feedback.whereLost} icon={CircleAlert} tone="text-error" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ReactionList({ title, items, icon: Icon, tone }: { title: string; items: string[]; icon: typeof Check; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-label-md text-on-surface-variant">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-body-md text-on-surface">
            <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", tone)} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
