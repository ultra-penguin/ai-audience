import { Ear } from "lucide-react";
import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn } from "@/lib/utils";
import { DEMO, PERSONA_ICON } from "./landing-data";
import { Reveal } from "./reveal";
import { SectionIntro } from "./section-intro";

/** Section 05: instead of one AI judge, several listeners with different backgrounds. */
export function AudienceSection() {
  return (
    <section aria-labelledby="audience-title" className="space-y-10 border-t border-outline-variant/60 py-14 md:py-20">
      <SectionIntro id="audience-title" eyebrow="AI 관중" title="그래서 우리는 AI 관중을 만들었습니다.">
        하나의 AI에게 발표를 평가시키는 대신, 서로 다른 배경과 이해 수준을 가진 여러 관중을 시뮬레이션합니다.
      </SectionIntro>
      <ul className="grid gap-4 md:grid-cols-3 md:gap-6">
        {DEMO.personas.map((persona, i) => {
          const Icon = PERSONA_ICON[persona.kind];
          const style = PERSONA_STYLE[persona.kind];
          return (
            <li key={persona.id}>
              <Reveal delayMs={i * 90} className="h-full">
                <article className={cn("flex h-full flex-col gap-4 rounded-2xl border-t-2 bg-surface-container-lowest p-6 ring-1 ring-outline-variant/60 sm:p-7", style.rail)}>
                  <div className="flex items-center gap-3">
                    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", style.chip)}>
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-label-sm text-on-surface-variant">관중 {String(i + 1).padStart(2, "0")}</p>
                      <h3 className="text-headline-md text-on-surface">{persona.name}</h3>
                    </div>
                  </div>
                  <p className="text-body-lg text-on-surface break-keep">{persona.description}</p>
                  <p className="mt-auto flex gap-2 border-t border-outline-variant/60 pt-4 text-body-md text-on-surface-variant break-keep">
                    <Ear aria-hidden className="mt-0.5 size-4 shrink-0" />
                    <span>
                      <span className="sr-only">이 관중이 귀 기울이는 것: </span>
                      {persona.listensFor}
                    </span>
                  </p>
                </article>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
