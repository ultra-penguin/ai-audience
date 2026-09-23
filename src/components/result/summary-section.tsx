import { CircleCheck, CircleDashed, CircleSlash } from "lucide-react";
import type { AnalysisResult, Understanding } from "@/shared/api/types";
import { PersonaChip } from "@/components/ui/persona-chip";
import { cn } from "@/lib/utils";

export const UNDERSTANDING: Record<Understanding, { label: string; icon: typeof CircleCheck; tone: string }> = {
  followed: { label: "끝까지 따라왔어요", icon: CircleCheck, tone: "text-secondary" },
  partly_lost: { label: "중간에 놓친 곳이 있어요", icon: CircleDashed, tone: "text-tertiary" },
  lost: { label: "흐름을 놓쳤어요", icon: CircleSlash, tone: "text-error" },
};

export function SummarySection({ result }: { result: AnalysisResult }) {
  const { summary, personas, personaFeedback } = result;
  const received = personaFeedback.filter((f) => f.receivedKeyMessage).length;
  const byId = new Map(personas.map((p) => [p.id, p]));

  return (
    <section aria-labelledby="summary-title" className="space-y-6">
      <h2 id="summary-title" className="sr-only">
        한눈에 보기
      </h2>
      <p className="max-w-3xl text-headline-md text-on-surface text-pretty">{summary.headline}</p>

      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl bg-surface-container-low p-5">
          <p className="text-label-md text-on-surface-variant">전하려던 핵심 메시지</p>
          <p className="mt-2 text-body-lg text-on-surface">“{summary.intendedKeyMessage}”</p>
          <p className="mt-4 text-label-lg text-on-surface">
            관중 {personaFeedback.length}명 중 {received}명이 이 메시지를 알아들었어요.
          </p>
        </div>

        <ul className="divide-y divide-outline-variant/50 rounded-xl bg-surface-container-lowest px-5 ring-1 ring-outline-variant/40">
          {personaFeedback.map((f) => {
            const persona = byId.get(f.personaId);
            if (!persona) return null;
            const u = UNDERSTANDING[f.understanding];
            return (
              <li key={f.personaId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <PersonaChip persona={persona} />
                <span className={cn("inline-flex items-center gap-1.5 text-body-md", u.tone)}>
                  <u.icon aria-hidden className="size-4" />
                  <span className="text-on-surface">{u.label}</span>
                </span>
              </li>
            );
          })}
        </ul>
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
