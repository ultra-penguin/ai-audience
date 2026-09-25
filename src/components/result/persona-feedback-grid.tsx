"use client";

import { ArrowDown } from "lucide-react";
import type { AnalysisResult } from "@/shared/api/types";
import { useResultUiStore } from "@/features/result/result-ui-store";
import { sectionsHeardBy } from "@/features/result/report";
import { PersonaChip } from "@/components/ui/persona-chip";
import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn } from "@/lib/utils";
import { ReportHeading } from "./report-parts";
import { UNDERSTANDING } from "./summary-section";

/** Each listener in their own words, before any analysis of why. */
export function PersonaFeedbackGrid({ result, number }: { result: AnalysisResult; number: number }) {
  const byId = new Map(result.personas.map((p) => [p.id, p]));
  const setPersonaFilter = useResultUiStore((s) => s.setPersonaFilter);

  return (
    <section id="personas" aria-labelledby="personas-title" className="scroll-mt-24 space-y-4">
      <ReportHeading id="personas-title" number={number} title="관중의 목소리">
        같은 발표를 들은 관중이 각자 무엇을 가져가고, 어디서 놓쳤는지 들은 그대로예요.
      </ReportHeading>

      <ul className="divide-y divide-outline-variant/50">
        {result.personaFeedback.map((f) => {
          const persona = byId.get(f.personaId);
          if (!persona) return null;
          const u = UNDERSTANDING[f.understanding];
          const stuckCount = sectionsHeardBy(result.difficultSections, persona.id).length;
          return (
            <li key={f.personaId} className="grid gap-3 py-4 first:pt-0 md:grid-cols-[12rem_1fr] md:gap-6">
              <div className="space-y-2">
                <PersonaChip persona={persona} />
                <p className="text-body-sm text-on-surface-variant">{persona.description}</p>
                <p className={cn("inline-flex items-center gap-1.5 text-label-md", u.tone)}>
                  <u.icon aria-hidden className="size-3.5" />
                  <span className="text-on-surface">{u.label}</span>
                </p>
              </div>

              <div className="min-w-0 space-y-4">
                <blockquote className={cn("border-l-[3px] pl-4 text-body-lg text-on-surface", PERSONA_STYLE[persona.kind].rail)}>
                  “{f.reaction}”
                </blockquote>
                <dl className="grid gap-3 text-body-md sm:grid-cols-2">
                  <Facts title="놓친 곳" items={f.whereLost} empty="막힌 곳 없이 따라왔어요." />
                  {f.whatLanded.length > 0 && <Facts title="전달된 것" items={f.whatLanded} />}
                </dl>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm text-on-surface-variant">
                  <span className={u.tone}>{u.label}</span>
                  {stuckCount > 0 && (
                    <a
                      href="#sections-title"
                      onClick={() => setPersonaFilter(persona.id)}
                      className="inline-flex items-center gap-1 rounded text-label-md text-primary underline-offset-4 hover:underline"
                    >
                      이 관중이 막힌 구간 {stuckCount}곳 보기
                      <ArrowDown aria-hidden className="size-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Facts({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  return (
    <div className="rounded-lg bg-surface-container-low p-3">
      <dt className="text-label-md text-on-surface-variant">{title}</dt>
      {items.length > 0 ? (
        items.map((item) => (
          <dd key={item} className="mt-1.5 text-on-surface">
            {item}
          </dd>
        ))
      ) : (
        <dd className="mt-1.5 text-on-surface-variant">{empty}</dd>
      )}
    </div>
  );
}
