import type { ConfusionCause, DifficultSection, Likelihood, Persona } from "@/shared/api/types";
import { PersonaChip } from "@/components/ui/persona-chip";
import { cn, formatDuration } from "@/lib/utils";

export const CATEGORY_LABEL: Record<NonNullable<DifficultSection["category"]>, string> = {
  terminology: "낯선 용어",
  missing_context: "빠진 설명",
  pace: "속도",
  structure: "구성",
  abstract: "추상적 설명",
  key_message: "핵심 메시지",
};

/** The simulation's classified cause of confusion; preferred over the coarser category. */
export const CAUSE_LABEL: Record<ConfusionCause, string> = {
  TERM_CONFUSION: "낯선 용어",
  CONCEPT_CONFUSION: "개념 이해 어려움",
  CONNECTION_CONFUSION: "개념 사이 관계",
  PURPOSE_CONFUSION: "왜 필요한지 모름",
  EXAMPLE_GAP: "구체적인 사례 부족",
  CONTEXT_GAP: "배경 설명 부족",
  LOGIC_GAP: "논리 연결 부족",
  REFERENCE_GAP: "설명 안 된 대상 참조",
};

/** Simulated reactions are estimates: always say how likely, never state them as fact. */
export const LIKELIHOOD_LABEL: Record<Likelihood, string> = {
  high: "높은 확률",
  likely: "가능성이 높음",
  possible: "가능성이 있음",
  unlikely: "가능성이 낮음",
  uncertain: "판단하기 어려움",
};

export function issueLabel(section: Pick<DifficultSection, "cause" | "category">): string {
  if (section.cause) return CAUSE_LABEL[section.cause];
  return section.category ? CATEGORY_LABEL[section.category] : "설명이 더 필요한 구간";
}

export function Highlighted({ text, highlight }: { text: string; highlight?: string }) {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (!highlight || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-error-container px-1 text-on-error-container">{highlight}</mark>
      {text.slice(at + highlight.length)}
    </>
  );
}

function Step({ index, label, last, children }: { index: number; label: string; last?: boolean; children: React.ReactNode }) {
  return (
    <li className="relative grid grid-cols-[1.75rem_1fr] gap-3">
      <div className="flex flex-col items-center">
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full bg-surface-container text-label-md text-on-surface-variant"
        >
          {index}
        </span>
        {!last && <span aria-hidden className="mt-1 w-px flex-1 bg-outline-variant/70" />}
      </div>
      <div className={cn("min-w-0 space-y-2", !last && "pb-5")}>
        <p className="pt-1 text-label-md text-on-surface-variant">{label}</p>
        {children}
      </div>
    </li>
  );
}

/**
 * The product's core reading order for one difficult point:
 * audience perspective → difficult point → reason → improvement.
 */
export function FeedbackChain({
  section,
  personas,
  compact = false,
}: {
  section: DifficultSection;
  personas: Persona[];
  compact?: boolean;
}) {
  const byId = new Map(personas.map((p) => [p.id, p]));
  const categoryLabel = issueLabel(section);

  return (
    <ol className={cn(compact ? "text-body-md" : "text-body-lg")}>
      <Step index={1} label={section.likelihood ? `관중의 반응 · ${LIKELIHOOD_LABEL[section.likelihood]}` : "관중의 반응"}>
        {section.reactions.length > 0 ? (
          <ul className="space-y-3">
            {section.reactions.map((r) => {
              const persona = byId.get(r.personaId);
              return (
                <li key={r.personaId} className="space-y-1.5">
                  {persona && <PersonaChip persona={persona} />}
                  <p className="text-on-surface">“{r.reaction}”</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-body-md text-on-surface-variant">관중별로 어느 사람이 막혔는지는 아직 구분하지 못했어요. 이 구간은 추가 설명이 필요한 지점으로 표시됐습니다.</p>
        )}
      </Step>

      <Step index={2} label={`막힌 지점 · ${formatDuration(section.startSec)}–${formatDuration(section.endSec)}`}>
        <blockquote className="rounded-lg bg-surface-container-low p-3 text-on-surface-variant sm:p-4">
          <Highlighted text={section.transcript} highlight={section.highlight} />
        </blockquote>
      </Step>

      <Step index={3} label={`이유 · ${categoryLabel}`}>
        <p className="text-on-surface">{section.reason}</p>
        {section.pattern && (
          <p className="text-body-md text-on-surface-variant">
            <span className="text-label-md text-on-surface">관중마다 달랐던 이유 · </span>
            {section.pattern}
          </p>
        )}
      </Step>

      <Step index={4} label="이렇게 고쳐보세요" last>
        <p className="text-on-surface">{section.improvement.suggestion}</p>
        {section.improvement.rewrite && (
          <p className="rounded-lg bg-secondary-fixed/25 px-3 py-2 text-on-surface shadow-sm sm:px-4 sm:py-3">
            <span className="mb-1 block text-label-sm text-on-secondary-fixed-variant">바꿔 말하기 예시</span>
            {section.improvement.rewrite}
          </p>
        )}
      </Step>
    </ol>
  );
}
