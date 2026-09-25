import type { AnalysisResult, Persona } from "@/shared/api/types";
import { PersonaChip } from "@/components/ui/persona-chip";
import { Card } from "@/components/ui/card";
import { ReportHeading, SectionLink } from "./report-parts";

function Personas({ ids, byId }: { ids: string[]; byId: Map<string, Persona> }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="이 피드백을 남긴 관중">
      {ids.map((id) => {
        const p = byId.get(id);
        return p ? <PersonaChip key={id} persona={p} /> : null;
      })}
    </div>
  );
}

export function SuggestionsSection({ result, number }: { result: AnalysisResult; number: number }) {
  const { missingExplanations, exampleSuggestions } = result;
  if (missingExplanations.length === 0 && exampleSuggestions.length === 0) return null;
  const byId = new Map(result.personas.map((p) => [p.id, p]));
  const sectionIds = new Set(result.difficultSections.map((s) => s.id));
  const hasMissingExplanations = missingExplanations.length > 0;
  const hasExampleSuggestions = exampleSuggestions.length > 0;
  const hasBothCategories = hasMissingExplanations && hasExampleSuggestions;

  return (
    <section aria-labelledby="suggestions-title" className="space-y-5">
      <ReportHeading id="suggestions-title" number={number} title="보충하면 좋은 것">
        관중이 기대했지만 발표에 없던 설명과, 이해를 도울 예시예요.
      </ReportHeading>
      <div className={hasBothCategories ? "grid gap-6 md:grid-cols-2" : "max-w-4xl"}>
        {hasMissingExplanations && (
          <Card aria-labelledby="missing-explanations-title" className="p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-4 border-b border-outline-variant/60 pb-3">
              <h3 id="missing-explanations-title" className="text-headline-sm text-on-surface">
                빠진 설명
              </h3>
              <span className="shrink-0 text-label-md tabular-nums text-on-surface-variant">
                {missingExplanations.length}개
              </span>
            </div>
            <ul className="divide-y divide-outline-variant/50">
              {missingExplanations.map((m, index) => (
                <li key={m.id} className="space-y-3 py-4 first:pt-2 last:pb-2">
                  <div className="flex items-start gap-3">
                    <span className="pt-0.5 text-label-md tabular-nums text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                        <p className="text-label-lg text-on-surface">{m.term}</p>
                        {m.sectionId && sectionIds.has(m.sectionId) && (
                          <SectionLink sectionId={m.sectionId}>해당 구간 보기</SectionLink>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-8 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-label-md text-on-secondary-fixed-variant">왜 필요한가</p>
                      <p className="mt-1.5 text-body-md text-on-surface-variant">{m.why}</p>
                    </div>
                    <div className="border-t border-primary/25 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                      <p className="text-label-md text-on-primary-fixed-variant">이렇게 설명해 보세요</p>
                      <p className="mt-1.5 text-body-md text-on-surface">{m.suggestedExplanation}</p>
                    </div>
                  </div>
                  <div className="ml-8">
                    <Personas ids={m.personaIds} byId={byId} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {hasExampleSuggestions && (
          <Card aria-labelledby="example-suggestions-title" className="p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-4 border-b border-outline-variant/60 pb-3">
              <h3 id="example-suggestions-title" className="text-headline-sm text-on-surface">
                추가하면 좋은 예시
              </h3>
              <span className="shrink-0 text-label-md tabular-nums text-on-surface-variant">
                {exampleSuggestions.length}개
              </span>
            </div>
            <ul className="divide-y divide-outline-variant/50">
              {exampleSuggestions.map((e, index) => (
                <li key={e.id} className="space-y-3 py-4 first:pt-2 last:pb-2">
                  <div className="flex items-start gap-3">
                    <span className="pt-0.5 text-label-md tabular-nums text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                        <p className="text-label-lg text-on-surface">{e.concept}</p>
                        {e.sectionId && sectionIds.has(e.sectionId) && (
                          <SectionLink sectionId={e.sectionId}>해당 구간 보기</SectionLink>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="ml-8 text-body-md text-on-surface">
                    {e.example}
                  </p>
                  <div className="ml-8">
                    <Personas ids={e.personaIds} byId={byId} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </section>
  );
}
