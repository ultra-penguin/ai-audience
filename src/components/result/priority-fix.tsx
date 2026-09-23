import { ArrowDown } from "lucide-react";
import type { DifficultSection, Persona } from "@/shared/api/types";
import { PersonaChip } from "@/components/ui/persona-chip";
import { formatDuration } from "@/lib/utils";
import { CATEGORY_LABEL } from "./feedback-chain";

/** The one thing to fix first, in the product's reading order. */
export function PriorityFix({ section, personas }: { section: DifficultSection; personas: Persona[] }) {
  const byId = new Map(personas.map((p) => [p.id, p]));
  const firstReaction = section.reactions[0];

  const rows = [
    {
      term: "누가 막혔나요",
      body: (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {section.reactions.map((r) => {
              const p = byId.get(r.personaId);
              return p ? <PersonaChip key={r.personaId} persona={p} /> : null;
            })}
          </div>
          <p className="text-on-surface">“{firstReaction.reaction}”</p>
        </div>
      ),
    },
    {
      term: "어디서",
      body: (
        <p className="text-on-surface">
          <span className="mr-2 rounded bg-surface-container px-1.5 py-0.5 text-label-md tabular-nums text-on-surface-variant">
            {formatDuration(section.startSec)}
          </span>
          “{section.highlight ?? section.transcript}”
        </p>
      ),
    },
    { term: "왜", body: <p className="text-on-surface">{section.reason}</p> },
    { term: "이렇게 고쳐보세요", body: <p className="text-on-surface">{section.improvement.suggestion}</p> },
  ];

  return (
    <section aria-labelledby="priority-title" className="rounded-xl bg-surface-container-lowest p-5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06)] ring-1 ring-primary-container/25 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="priority-title" className="text-headline-md text-on-surface">
          가장 먼저 고칠 곳
        </h2>
        <span className="rounded bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed">{CATEGORY_LABEL[section.category]}</span>
      </div>
      <dl className="mt-5 grid gap-x-6 gap-y-4 text-body-lg sm:grid-cols-[9rem_1fr]">
        {rows.map((row) => (
          <div key={row.term} className="contents">
            <dt className="text-label-lg text-on-surface-variant sm:pt-0.5">{row.term}</dt>
            <dd className="min-w-0">{row.body}</dd>
          </div>
        ))}
      </dl>
      <a
        href={`#${section.id}`}
        className="mt-6 inline-flex items-center gap-1.5 rounded-md text-label-lg text-primary underline-offset-4 hover:underline"
      >
        바꿔 말하기 예시까지 보기
        <ArrowDown aria-hidden className="size-4" />
      </a>
    </section>
  );
}
