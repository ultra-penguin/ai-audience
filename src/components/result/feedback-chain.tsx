import type { DifficultSection, Persona } from "@/shared/api/types";
import { PersonaChip } from "@/components/ui/persona-chip";
import { cn, formatDuration } from "@/lib/utils";

export const CATEGORY_LABEL: Record<DifficultSection["category"], string> = {
  terminology: "낯선 용어",
  missing_context: "빠진 설명",
  pace: "속도",
  structure: "구성",
  abstract: "추상적 설명",
  key_message: "핵심 메시지",
};

function Highlighted({ text, highlight }: { text: string; highlight?: string }) {
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

  return (
    <ol className={cn(compact ? "text-body-md" : "text-body-lg")}>
      <Step index={1} label="관중의 반응">
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
      </Step>

      <Step index={2} label={`막힌 지점 · ${formatDuration(section.startSec)}–${formatDuration(section.endSec)}`}>
        <blockquote className="rounded-lg bg-surface-container-low p-3 text-on-surface-variant sm:p-4">
          <Highlighted text={section.transcript} highlight={section.highlight} />
        </blockquote>
      </Step>

      <Step index={3} label={`이유 · ${CATEGORY_LABEL[section.category]}`}>
        <p className="text-on-surface">{section.reason}</p>
      </Step>

      <Step index={4} label="이렇게 고쳐보세요" last>
        <p className="text-on-surface">{section.improvement.suggestion}</p>
        {section.improvement.rewrite && (
          <p className="rounded-lg border-l-2 border-secondary bg-secondary-fixed/25 px-3 py-2 text-on-surface sm:px-4 sm:py-3">
            <span className="mb-1 block text-label-sm text-on-secondary-fixed-variant">바꿔 말하기 예시</span>
            {section.improvement.rewrite}
          </p>
        )}
      </Step>
    </ol>
  );
}
