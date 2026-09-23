"use client";

import type { AnalysisResult, DifficultSection } from "@/shared/api/types";
import { useResultUiStore } from "@/features/result/result-ui-store";
import { Card } from "@/components/ui/card";
import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn, formatDuration } from "@/lib/utils";
import { CATEGORY_LABEL, FeedbackChain } from "./feedback-chain";

const SEVERITY_LABEL: Record<DifficultSection["severity"], string> = {
  high: "여러 관중이 크게 막힘",
  medium: "일부 관중이 막힘",
  low: "살짝 걸림",
};

function Timeline({ sections, durationSec, priorityId }: { sections: DifficultSection[]; durationSec: number; priorityId?: string }) {
  const total = Math.max(durationSec, ...sections.map((s) => s.endSec), 1);
  return (
    <div className="space-y-2">
      <div className="relative h-8">
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-container-highest" />
        <ol aria-label="발표 시간대별 막힌 지점">
          {sections.map((s) => {
            const left = (s.startSec / total) * 100;
            const width = Math.max(((s.endSec - s.startSec) / total) * 100, 1.5);
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="group absolute top-0 flex h-8 min-w-6 items-center"
                  style={{ left: `${left}%`, width: `${width}%` }}
                  aria-label={`${formatDuration(s.startSec)} ${CATEGORY_LABEL[s.category]}, 관중 ${s.reactions.length}명`}
                >
                  <span
                    className={cn(
                      "h-2 w-full rounded-full transition-[height] group-hover:h-3",
                      s.id === priorityId ? "bg-error" : s.severity === "high" ? "bg-error/70" : "bg-tertiary-fixed-dim",
                    )}
                  />
                </a>
              </li>
            );
          })}
        </ol>
      </div>
      <div aria-hidden className="flex justify-between text-label-sm tabular-nums text-on-surface-variant">
        <span>0:00</span>
        <span>{formatDuration(total)}</span>
      </div>
    </div>
  );
}

function PersonaFilter({ result }: { result: AnalysisResult }) {
  const { personaFilter, setPersonaFilter } = useResultUiStore();
  const options: { id: string | null; label: string; dot?: string }[] = [
    { id: null, label: "모든 관중" },
    ...result.personas.map((p) => ({ id: p.id, label: p.name, dot: PERSONA_STYLE[p.kind].dot })),
  ];

  return (
    <div role="group" aria-label="관중별로 보기" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {options.map((o) => {
        const selected = personaFilter === o.id;
        return (
          <button
            key={o.id ?? "all"}
            type="button"
            aria-pressed={selected}
            onClick={() => setPersonaFilter(o.id)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-label-md transition-colors",
              selected
                ? "bg-inverse-surface text-inverse-on-surface"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
            )}
          >
            {o.dot && <span aria-hidden className={cn("size-1.5 rounded-full", o.dot)} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function DifficultSections({ result }: { result: AnalysisResult }) {
  const personaFilter = useResultUiStore((s) => s.personaFilter);
  const sections = [...result.difficultSections].sort((a, b) => a.startSec - b.startSec);
  const visible = personaFilter ? sections.filter((s) => s.reactions.some((r) => r.personaId === personaFilter)) : sections;
  const priorityId = result.summary.priorityFixSectionId;
  const filterName = result.personas.find((p) => p.id === personaFilter)?.name;

  return (
    <section aria-labelledby="sections-title" className="space-y-5">
      <div className="space-y-1">
        <h2 id="sections-title" className="text-headline-lg text-on-surface">
          막힌 지점 {sections.length > 0 && <span className="text-on-surface-variant">{sections.length}곳</span>}
        </h2>
        <p className="text-body-md text-on-surface-variant">발표 순서대로, 관중이 어떻게 느꼈는지부터 이유와 고칠 방법까지 이어서 보여드려요.</p>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-xl bg-surface-container-low p-6 text-center">
          <p className="text-headline-sm text-on-surface">크게 막힌 지점을 찾지 못했어요</p>
          <p className="mx-auto mt-2 max-w-md text-body-md text-on-surface-variant">
            모든 관중이 흐름을 따라왔어요. 실제 청중이 더 낯설어할 만한 내용이 있다면, 그 부분을 넣어 다시 녹음해 보세요.
          </p>
        </div>
      ) : (
        <>
          <Timeline sections={sections} durationSec={result.durationSec} priorityId={priorityId} />
          <PersonaFilter result={result} />
          <p aria-live="polite" className="sr-only">
            {filterName ? `${filterName} 기준 ${visible.length}곳` : `전체 ${visible.length}곳`}
          </p>

          {visible.length === 0 ? (
            <p className="rounded-xl bg-surface-container-low p-5 text-body-md text-on-surface-variant">
              {filterName}은(는) 막힌 곳 없이 따라왔어요.
            </p>
          ) : (
            <ol className="space-y-4">
              {visible.map((s) => (
                <li key={s.id} id={s.id} className="scroll-mt-24">
                  <Card className={cn("p-5 sm:p-6", s.id === priorityId && "ring-primary-container/30")}>
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-surface-container px-1.5 py-0.5 text-label-md tabular-nums text-on-surface-variant">
                        {formatDuration(s.startSec)}
                      </span>
                      <span className="text-label-lg text-on-surface">{CATEGORY_LABEL[s.category]}</span>
                      <span className="text-body-sm text-on-surface-variant">· {SEVERITY_LABEL[s.severity]}</span>
                      {s.id === priorityId && (
                        <span className="ml-auto rounded bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed">먼저 고칠 곳</span>
                      )}
                    </div>
                    <FeedbackChain section={s} personas={result.personas} />
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
