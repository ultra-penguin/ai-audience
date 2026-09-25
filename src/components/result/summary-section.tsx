import { ArrowDown, CircleCheck, CircleDashed, CircleSlash } from "lucide-react";
import type { AnalysisResult, Understanding } from "@/shared/api/types";
import { distinctKeyMessage, stumbleText } from "@/features/result/report";
import { formatDuration } from "@/lib/utils";
import { CATEGORY_LABEL } from "./feedback-chain";

export const UNDERSTANDING: Record<Understanding, { label: string; icon: typeof CircleCheck; tone: string }> = {
  followed: { label: "끝까지 따라왔어요", icon: CircleCheck, tone: "text-secondary" },
  partly_lost: { label: "중간에 놓친 곳이 있어요", icon: CircleDashed, tone: "text-tertiary" },
  lost: { label: "흐름을 놓쳤어요", icon: CircleSlash, tone: "text-error" },
};

/** The opening insight: one sentence of what happened, then where to start. */
export function SummarySection({ result }: { result: AnalysisResult }) {
  const { summary, personaFeedback } = result;
  const received = personaFeedback.filter((f) => f.receivedKeyMessage).length;
  const keyMessage = distinctKeyMessage(summary);
  const priority = result.difficultSections.find((s) => s.id === summary.priorityFixSectionId);

  return (
    <section aria-labelledby="summary-title" className="space-y-8">
      <h2 id="summary-title" className="sr-only">
        한눈에 보기
      </h2>
      <p className="max-w-4xl text-[2rem] font-medium leading-[1.16] tracking-[-0.025em] text-on-surface text-pretty sm:text-[3rem]">{summary.headline}</p>

      <div className="grid gap-x-10 gap-y-8 border-y border-outline-variant/60 py-8 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-label-md text-on-surface-variant">핵심 메시지</p>
          {keyMessage && <p className="text-body-lg text-on-surface">“{keyMessage}”</p>}
          <p className="text-label-lg text-on-surface">
            관중 {personaFeedback.length}명 중 {received}명이 {keyMessage ? "이 메시지를" : "핵심 메시지를"} 알아들었어요.
          </p>
        </div>

        {priority ? (
          <div className="space-y-2">
            <p className="text-label-md text-on-surface-variant">
              먼저 고칠 곳 · <span className="tabular-nums">{formatDuration(priority.startSec)}</span> {priority.category ? CATEGORY_LABEL[priority.category] : "설명이 더 필요한 구간"}
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
          <div className="space-y-2">
            <p className="text-label-md text-on-surface-variant">먼저 고칠 곳</p>
            <p className="text-body-lg text-on-surface">
              {result.difficultSections.length === 0 ? "크게 막힌 지점이 없었어요." : "아래 막힌 구간을 발표 순서대로 확인해 보세요."}
            </p>
          </div>
        )}
      </div>

      {summary.strengths.length > 0 && (
        <details className="group rounded-xl bg-surface-container-low px-5 py-4">
          <summary className="cursor-pointer list-none text-label-lg text-on-surface marker:hidden">
            <span className="inline-flex items-center gap-2">
              잘 전달된 점 {summary.strengths.length}가지
              <span aria-hidden className="text-on-surface-variant transition-transform group-open:rotate-90">›</span>
            </span>
          </summary>
          <ul className="mt-3 space-y-2">
            {summary.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-body-md text-on-surface-variant">
                <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-secondary" />
                {s}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
