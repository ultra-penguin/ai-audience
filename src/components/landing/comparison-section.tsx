import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn } from "@/lib/utils";
import { DEMO, PERSONA_ICON } from "./landing-data";
import { Reveal } from "./reveal";
import { SectionIntro } from "./section-intro";
import { UiFlow, type FlowStep } from "./ui-flow";

const SCORING: FlowStep[] = [
  { key: "talk", content: "발표" },
  { key: "ai", content: "AI" },
  { key: "score", content: <span className="text-headline-sm tabular-nums">87점</span> },
  { key: "verdict", content: "“좋은 발표입니다.”" },
];

const SIMULATING: FlowStep[] = [
  { key: "talk", content: "발표" },
  {
    key: "audience",
    content: (
      <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <span>여러 AI 관중</span>
        <span className="flex gap-1.5" aria-hidden>
          {DEMO.personas.map((p) => {
            const Icon = PERSONA_ICON[p.kind];
            return (
              <span key={p.id} className={cn("flex size-7 items-center justify-center rounded-full", PERSONA_STYLE[p.kind].chip)}>
                <Icon className="size-3.5" />
              </span>
            );
          })}
        </span>
      </span>
    ),
  },
  { key: "each", content: "각자의 이해 / 혼란 / 반응" },
  { key: "common", content: "공통 문제 발견" },
  { key: "fix", content: "발표 개선", emphasis: true },
];

/** Section 09: scoring AI vs audience-simulating AI. */
export function ComparisonSection() {
  return (
    <section aria-labelledby="difference-title" className="space-y-10 border-t border-outline-variant/60 py-14 md:py-20">
      <SectionIntro id="difference-title" eyebrow="차이" title="AI가 발표를 평가하는 것과는 다릅니다." />
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <Reveal className="h-full">
          <div className="h-full space-y-5 rounded-2xl p-5 ring-1 ring-outline-variant/60 sm:p-7">
            <div className="space-y-1">
              <h3 className="text-headline-sm text-on-surface-variant">발표를 평가하는 AI</h3>
              <p className="text-body-md text-on-surface-variant break-keep">점수와 한 줄 평가가 남지만, 어디를 고쳐야 할지는 남지 않습니다.</p>
            </div>
            <UiFlow label="발표를 평가하는 AI의 흐름" steps={SCORING} tone="muted" />
          </div>
        </Reveal>
        <Reveal delayMs={120} className="h-full">
          <div className="h-full space-y-5 rounded-2xl bg-surface-container-low p-5 ring-1 ring-primary/35 sm:p-7">
            <div className="space-y-1">
              <h3 className="text-headline-sm text-on-surface">청중을 시뮬레이션하는 AI</h3>
              <p className="text-body-md text-on-surface-variant break-keep">관중마다 다른 반응에서 공통으로 막힌 곳을 찾아 고칠 문장을 알려줍니다.</p>
            </div>
            <UiFlow label="청중을 시뮬레이션하는 AI의 흐름" steps={SIMULATING} />
          </div>
        </Reveal>
      </div>
      <p className="mx-auto max-w-3xl text-center text-headline-lg text-on-surface text-balance break-keep sm:text-[2rem] sm:leading-[2.625rem]">
        점수를 만드는 AI가 아니라 <span className="text-primary">청중을 시뮬레이션하는 AI</span>
      </p>
    </section>
  );
}
