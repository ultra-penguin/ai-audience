import { ArrowDown, CircleCheck, CircleDashed, CircleSlash } from "lucide-react";
import type { AnalysisResult, Understanding } from "@/shared/api/types";
import { distinctKeyMessage, sectionsHeardBy, stumbleText } from "@/features/result/report";
import { heatmapIndex, mapSections } from "@/features/result/story";
import { PersonaChip } from "@/components/ui/persona-chip";
import { cn, formatDuration } from "@/lib/utils";
import { issueLabel } from "./feedback-chain";
import { RECEPTION } from "./story-sections";

export const UNDERSTANDING: Record<Understanding, { label: string; icon: typeof CircleCheck; tone: string }> = {
  followed: { label: "끝까지 따라왔어요", icon: CircleCheck, tone: "text-secondary" },
  partly_lost: { label: "중간에 놓친 곳이 있어요", icon: CircleDashed, tone: "text-tertiary" },
  lost: { label: "흐름을 놓쳤어요", icon: CircleSlash, tone: "text-error" },
};

/** The opening insight: one sentence of what happened, then where to start. */
export function SummarySection({ result }: { result: AnalysisResult }) {
  const { summary, personaFeedback } = result;
  const received = personaFeedback.filter((f) => f.understanding === "followed").length;
  const keyMessage = distinctKeyMessage(summary);
  const priority = result.difficultSections.find((s) => s.id === summary.priorityFixSectionId);

  return (
    <section aria-labelledby="summary-title" className="animate-rise-in space-y-5 motion-reduce:animate-none">
      <h2 id="summary-title" className="sr-only">
        한눈에 보기
      </h2>
      <p className="max-w-4xl text-[1.625rem] font-medium leading-[1.2] tracking-[-0.025em] text-on-surface text-pretty sm:text-[2.25rem]">{summary.headline}</p>

      <div className="grid gap-x-10 gap-y-5 border-t border-outline-variant/60 pt-5 md:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-label-md text-on-surface-variant">핵심 메시지</p>
          {keyMessage && <p className="text-body-lg text-on-surface">“{keyMessage}”</p>}
          <p className="text-label-lg text-on-surface">
            관중 {personaFeedback.length}명 중 {received}명이 발표 흐름을 끝까지 따라왔어요.
          </p>
        </div>

        {priority ? (
          <div className="space-y-1.5">
            <p className="text-label-md text-on-surface-variant">
              먼저 고칠 곳 · <span className="tabular-nums">{formatDuration(priority.startSec)}</span> {issueLabel(priority)}
            </p>
            <p className="text-body-lg text-on-surface">
              <mark className="rounded bg-error-container/70 px-1 text-on-surface">“{stumbleText(priority)}”</mark>
            </p>
            <p className="text-body-md text-on-surface-variant">{priority.improvement.suggestion}</p>
            <a
              href={`#fix-${priority.id}`}
              className="inline-flex items-center gap-1.5 rounded text-label-lg text-primary underline-offset-4 hover:underline"
            >
              고치는 방법 보기
              <ArrowDown aria-hidden className="size-4" />
            </a>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-label-md text-on-surface-variant">먼저 고칠 곳</p>
            <p className="text-body-lg text-on-surface">
              {result.difficultSections.length === 0 ? "크게 막힌 지점이 없었어요." : "아래 막힌 구간을 발표 순서대로 확인해 보세요."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/** What already worked, folded away so the opening stays about the next fix. */
export function Strengths({ result }: { result: AnalysisResult }) {
  const { strengths } = result.summary;
  if (strengths.length === 0) return null;
  return (
    <details className="group rounded-xl bg-surface-container-low px-4 py-3">
      <summary className="cursor-pointer list-none text-label-lg text-on-surface marker:hidden">
        <span className="inline-flex items-center gap-2">
          잘 전달된 점 {strengths.length}가지
          <span aria-hidden className="text-on-surface-variant transition-transform duration-200 ease-out group-open:rotate-90">›</span>
        </span>
      </summary>
      <ul className="mt-3 grid gap-x-8 gap-y-2 md:grid-cols-2">
        {strengths.map((s) => (
          <li key={s} className="flex gap-2 text-body-md text-on-surface-variant">
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-secondary" />
            {s}
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * One compact row per listener: how far they followed, whether the key
 * message landed, where they got stuck and, when the backend sent a heatmap,
 * their reception across the talk in speaking order.
 */
export function AudienceSnapshot({ result }: { result: AnalysisResult }) {
  const byId = new Map(result.personas.map((p) => [p.id, p]));
  const sections = mapSections(result);
  const index = heatmapIndex(result);
  const hasStrip = index.size > 0;

  return (
    <section aria-labelledby="snapshot-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="snapshot-title" className="text-label-lg text-on-surface">
          관중 반응
        </h2>
        <a href="#personas" className="rounded text-label-md text-primary underline-offset-4 hover:underline">
          관중의 목소리 전체 보기
        </a>
      </div>
      <ul className="divide-y divide-outline-variant/50 border-y border-outline-variant/60">
        {result.personaFeedback.map((feedback, i) => {
          const persona = byId.get(feedback.personaId);
          if (!persona) return null;
          const u = UNDERSTANDING[feedback.understanding];
          const stuck = sectionsHeardBy(result.difficultSections, persona.id).length;
          return (
            <li
              key={feedback.personaId}
              className="animate-rise-in space-y-2 py-3 motion-reduce:animate-none"
              style={{ animationDelay: `${80 + i * 50}ms` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <PersonaChip persona={persona} className="px-2 py-0.5" />
                <span className={cn("inline-flex items-center gap-1 text-label-md", u.tone)}>
                  <u.icon aria-hidden className="size-3.5" />
                  {u.label}
                </span>
              </div>
              <p className="line-clamp-2 text-body-sm text-on-surface">“{feedback.reaction}”</p>
              <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-label-md text-on-surface-variant">
                <span className={UNDERSTANDING[feedback.understanding].tone}>
                  {UNDERSTANDING[feedback.understanding].label}
                </span>
                {stuck > 0 && <span className="tabular-nums">막힌 구간 {stuck}곳</span>}
              </p>
              {hasStrip && (
                <ol aria-label={`${persona.name}의 구간별 반응`} className="flex gap-0.5">
                  {sections.map((s, si) => {
                    const cell = index.get(`${s.id}:${persona.id}`);
                    const label = cell ? RECEPTION[cell.reception].label : "정보 없음";
                    return (
                      <li
                        key={s.id}
                        title={`${si + 1}. ${s.title} · ${label}`}
                        className={cn("h-1.5 flex-1 rounded-full", cell ? RECEPTION[cell.reception].cell : "bg-surface-container")}
                      >
                        <span className="sr-only">
                          {si + 1}. {s.title}: {label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
