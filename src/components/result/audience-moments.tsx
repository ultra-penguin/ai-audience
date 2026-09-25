"use client";

import { MessageCircleQuestion, TrendingDown, TrendingUp } from "lucide-react";
import type { AnalysisResult, KeyMoment, Persona } from "@/shared/api/types";
import { PersonaChip } from "@/components/ui/persona-chip";
import { formatDuration } from "@/lib/utils";
import { ReportHeading, SectionLink } from "./report-parts";

const MOMENT_ICON: Record<KeyMoment["kind"], typeof TrendingDown> = {
  first_drop: TrendingDown,
  interest_peak: TrendingUp,
  common_question: MessageCircleQuestion,
};

function Chips({ ids, byId }: { ids: string[]; byId: Map<string, Persona> }) {
  return (
    <>
      {ids.map((id) => {
        const persona = byId.get(id);
        return persona ? <PersonaChip key={id} persona={persona} className="px-2 py-0.5" /> : null;
      })}
    </>
  );
}

/** Where in the talk the audience's experience turned: first drop, interest peak, shared question. */
export function KeyMoments({ result }: { result: AnalysisResult }) {
  const moments = result.keyMoments ?? [];
  if (moments.length === 0) return null;
  const byId = new Map(result.personas.map((p) => [p.id, p]));
  const hasMap = Boolean(result.presentationMap?.sections.length);

  return (
    <section aria-labelledby="moments-title" className="space-y-3">
      <h2 id="moments-title" className="text-label-lg text-on-surface">
        관중 경험이 바뀐 순간
      </h2>
      <ol className="grid gap-x-8 gap-y-4 border-y border-outline-variant/60 py-4 md:grid-cols-3">
        {moments.map((moment) => {
          const Icon = MOMENT_ICON[moment.kind];
          return (
            <li key={moment.id} className="min-w-0 space-y-1.5">
              <p className="flex items-center gap-2">
                <Icon aria-hidden className={moment.kind === "first_drop" ? "size-4 shrink-0 text-error" : "size-4 shrink-0 text-primary"} />
                <span className="text-label-md tabular-nums text-on-surface-variant">{formatDuration(moment.startSec)}</span>
                <span className="text-label-lg text-on-surface">{moment.title}</span>
              </p>
              <p className="text-body-sm text-on-surface-variant">{moment.detail}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Chips ids={moment.personaIds} byId={byId} />
                {moment.difficultSectionId ? (
                  <SectionLink sectionId={moment.difficultSectionId} className="ml-1">
                    해당 구간 보기
                  </SectionLink>
                ) : (
                  hasMap &&
                  moment.sectionId && (
                    <a href={`#map-${moment.sectionId}`} className="ml-1 rounded text-label-md text-primary underline-offset-4 hover:underline">
                      발표 지도에서 보기
                    </a>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Only questions a listener would plausibly have had at that point — not questions to sound clever. */
export function NaturalQuestionsSection({ result, number }: { result: AnalysisResult; number: number }) {
  const questions = result.naturalQuestions ?? [];
  if (questions.length === 0) return null;
  const byId = new Map(result.personas.map((p) => [p.id, p]));
  const hasMap = Boolean(result.presentationMap?.sections.length);

  return (
    <section aria-labelledby="questions-title" className="space-y-4">
      <ReportHeading id="questions-title" number={number} title="관중이 가졌을 질문">
        지금까지 들은 내용에서 자연스럽게 생겼을 가능성이 높은 질문만 골랐어요. 발표 중이나 질의응답에서 미리 답해 보세요.
      </ReportHeading>
      <ol className="divide-y divide-outline-variant/50 border-y border-outline-variant/60">
        {questions.map((q, index) => (
          <li key={q.id} className="grid gap-2 py-3 sm:grid-cols-[2rem_1fr_auto] sm:items-baseline sm:gap-4">
            <span aria-hidden className="text-label-md tabular-nums text-primary">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 space-y-1.5">
              <p className="text-body-lg text-on-surface">“{q.question}”</p>
              <div className="flex flex-wrap gap-1.5">
                <Chips ids={q.personaIds} byId={byId} />
              </div>
            </div>
            {q.startSec !== undefined &&
              (hasMap && q.sectionId ? (
                <a href={`#map-${q.sectionId}`} className="rounded text-label-md tabular-nums text-primary underline-offset-4 hover:underline">
                  {formatDuration(q.startSec)} 구간
                </a>
              ) : (
                <span className="text-label-md tabular-nums text-on-surface-variant">{formatDuration(q.startSec)}</span>
              ))}
          </li>
        ))}
      </ol>
    </section>
  );
}
