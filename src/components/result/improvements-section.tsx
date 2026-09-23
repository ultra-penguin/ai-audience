import { ArrowDown, ArrowRight } from "lucide-react";
import type { AnalysisResult, DifficultSection, Persona } from "@/shared/api/types";
import { sectionsByFixOrder, stumbleText } from "@/features/result/report";
import { PersonaChip } from "@/components/ui/persona-chip";
import { cn, formatDuration } from "@/lib/utils";
import { CATEGORY_LABEL } from "./feedback-chain";
import { ReportHeading, SectionLink } from "./report-parts";

/** What was said next to the rewrite the analysis suggested, when there is one. */
function BeforeAfter({ section }: { section: DifficultSection }) {
  const rewrite = section.improvement.rewrite?.trim();
  if (!rewrite) return null;
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch md:gap-3">
      <figure className="rounded-lg bg-surface-container-low p-4">
        <figcaption className="text-label-sm text-on-surface-variant">지금 이렇게 말했어요</figcaption>
        <blockquote className="mt-2 text-body-md text-on-surface-variant">“{stumbleText(section)}”</blockquote>
      </figure>
      <span aria-hidden className="flex items-center justify-center text-on-surface-variant">
        <ArrowDown className="size-4 md:hidden" />
        <ArrowRight className="hidden size-4 md:block" />
      </span>
      <figure className="rounded-lg bg-secondary-fixed/25 p-4 ring-1 ring-secondary/15">
        <figcaption className="text-label-sm text-on-secondary-fixed-variant">예시 문장</figcaption>
        <blockquote className="mt-2 text-body-md text-on-surface">{rewrite}</blockquote>
      </figure>
    </div>
  );
}

function Who({ section, byId }: { section: DifficultSection; byId: Map<string, Persona> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {section.reactions.map((r) => {
        const p = byId.get(r.personaId);
        return p ? <PersonaChip key={r.personaId} persona={p} /> : null;
      })}
    </div>
  );
}

/** Actionable repairs, the priority first. Missing explanations and examples follow separately. */
export function ImprovementsSection({ result, number }: { result: AnalysisResult; number: number }) {
  if (result.difficultSections.length === 0) return null;
  const priorityId = result.summary.priorityFixSectionId;
  const fixes = sectionsByFixOrder(result.difficultSections, priorityId);
  const byId = new Map(result.personas.map((p) => [p.id, p]));

  return (
    <section aria-labelledby="fixes-title" className="space-y-6">
      <ReportHeading id="fixes-title" number={number} title="이렇게 고쳐보세요">
        고칠 순서대로 정리했어요. 먼저 고칠 곳 하나만 바꿔도 다음 리허설에서 차이를 확인할 수 있어요.
      </ReportHeading>

      <ol className="space-y-4">
        {fixes.map((s, i) => {
          const isPriority = s.id === priorityId;
          return (
            <li
              key={s.id}
              id={`fix-${s.id}`}
              className={cn(
                "scroll-mt-24 space-y-4 rounded-xl p-5 sm:p-6",
                isPriority
                  ? "bg-surface-container-lowest shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06)] ring-1 ring-primary-container/25"
                  : "bg-surface-container-lowest ring-1 ring-outline-variant/40",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span aria-hidden className="text-label-md tabular-nums text-on-surface-variant">
                  {i + 1}.
                </span>
                <span className="text-label-lg text-on-surface">{s.category ? CATEGORY_LABEL[s.category] : "설명이 더 필요한 구간"}</span>
                <span className="rounded bg-surface-container px-1.5 py-0.5 text-label-md tabular-nums text-on-surface-variant">
                  {formatDuration(s.startSec)}
                </span>
                {isPriority && <span className="rounded bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed">먼저 고칠 곳</span>}
              </div>

              <p className={cn("text-on-surface", isPriority ? "text-headline-sm" : "text-body-lg")}>{s.improvement.suggestion}</p>
              <p className="text-body-md text-on-surface-variant">{s.reason}</p>

              <BeforeAfter section={s} />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Who section={s} byId={byId} />
                <SectionLink sectionId={s.id}>관중 반응 다시 보기</SectionLink>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
