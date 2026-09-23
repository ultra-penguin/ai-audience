import type { AnalysisResult, Persona } from "@/shared/api/types";
import { PersonaChip } from "@/components/ui/persona-chip";

function Personas({ ids, byId }: { ids: string[]; byId: Map<string, Persona> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const p = byId.get(id);
        return p ? <PersonaChip key={id} persona={p} /> : null;
      })}
    </div>
  );
}

export function SuggestionsSection({ result }: { result: AnalysisResult }) {
  const { missingExplanations, exampleSuggestions } = result;
  if (missingExplanations.length === 0 && exampleSuggestions.length === 0) return null;
  const byId = new Map(result.personas.map((p) => [p.id, p]));

  return (
    <section aria-labelledby="suggestions-title" className="space-y-5">
      <h2 id="suggestions-title" className="text-headline-lg text-on-surface">
        보충하면 좋은 것
      </h2>
      <div className="grid gap-6 lg:grid-cols-2">
        {missingExplanations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-headline-sm text-on-surface">빠진 설명</h3>
            <ul className="space-y-3">
              {missingExplanations.map((m) => (
                <li key={m.id} className="space-y-2 rounded-xl bg-surface-container-low p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-label-lg text-on-surface">{m.term}</p>
                    {m.sectionId && (
                      <a href={`#${m.sectionId}`} className="rounded text-label-md text-primary underline-offset-4 hover:underline">
                        해당 지점 보기
                      </a>
                    )}
                  </div>
                  <p className="text-body-md text-on-surface-variant">{m.why}</p>
                  <p className="text-body-md text-on-surface">
                    <span className="text-label-md text-on-secondary-fixed-variant">이렇게 설명해 보세요 · </span>
                    {m.suggestedExplanation}
                  </p>
                  <Personas ids={m.personaIds} byId={byId} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {exampleSuggestions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-headline-sm text-on-surface">추가하면 좋은 예시</h3>
            <ul className="space-y-3">
              {exampleSuggestions.map((e) => (
                <li key={e.id} className="space-y-2 rounded-xl bg-surface-container-low p-4">
                  <p className="text-label-lg text-on-surface">{e.concept}</p>
                  <p className="text-body-md text-on-surface">{e.example}</p>
                  <Personas ids={e.personaIds} byId={byId} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
