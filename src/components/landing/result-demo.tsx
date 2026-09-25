import { ArrowRight, Lightbulb, Users } from "lucide-react";
import Link from "next/link";
import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn, formatDuration } from "@/lib/utils";
import { DEMO, DEMO_FOCUS, DEMO_ISSUE, PERSONA_ICON, RECEPTION_META } from "./landing-data";
import { Reveal } from "./reveal";
import { SectionIntro } from "./section-intro";

const segments = DEMO.transcript?.segments ?? [];
const focusIndex = segments.findIndex((s) => s.id === DEMO_ISSUE.id);
/** The stuck sentence with one line of context on each side, as the presenter actually said it. */
const EXCERPT = [
  focusIndex > 0 ? { ...segments[focusIndex - 1]!, focus: false } : null,
  { id: DEMO_ISSUE.id, startSec: DEMO_ISSUE.startSec, text: DEMO_ISSUE.transcript, focus: true },
  focusIndex >= 0 && focusIndex < segments.length - 1 ? { ...segments[focusIndex + 1]!, focus: false } : null,
].filter((s) => s !== null);

const total = DEMO_FOCUS.listeners.length;
const COMMON_SIGNAL = `${total}명의 관중 중 ${DEMO_FOCUS.wavered}명이 같은 구간에서 이해가 흔들렸어요.`;

function Highlighted({ text, highlight }: { text: string; highlight?: string }) {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (!highlight || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-primary-fixed px-0.5 text-on-primary-fixed [box-decoration-break:clone] underline decoration-primary decoration-2 underline-offset-4">
        {highlight}
      </mark>
      {text.slice(at + highlight.length)}
    </>
  );
}

/** Section 08: a service-like example analysis, clearly labeled DEMO. */
export function ResultDemo() {
  return (
    <section aria-labelledby="demo-title" className="space-y-10 border-t border-outline-variant/60 py-14 md:py-20">
      <SectionIntro id="demo-title" eyebrow="예시 분석" title="실제로는 이렇게 분석합니다.">
        발표의 한 순간을 여러 관중이 어떻게 받아들였는지, 그리고 무엇을 고치면 되는지까지 이어서 보여줍니다.
      </SectionIntro>

      <Reveal>
        <div className="overflow-hidden rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/70">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-outline-variant/60 px-5 py-3 sm:px-7">
            <p className="flex min-w-0 items-center gap-2.5 text-label-lg text-on-surface">
              <span className="shrink-0 rounded-md bg-inverse-surface px-2 py-0.5 text-label-sm tracking-[0.12em] text-inverse-on-surface">DEMO · 예시 분석</span>
              <span className="truncate">{DEMO.title}</span>
            </p>
            <p className="text-label-md text-on-surface-variant">샘플 발표 · {formatDuration(DEMO.durationSec)} · 관중 {total}명</p>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="space-y-4 p-5 sm:p-7 lg:border-r lg:border-outline-variant/60">
              <h3 className="text-label-lg text-on-surface-variant">발표 · {formatDuration(DEMO_FOCUS.startSec)} ‘{DEMO_FOCUS.title}’</h3>
              <ol className="space-y-3">
                {EXCERPT.map((line) => (
                  <li
                    key={line.id}
                    className={cn(
                      "grid grid-cols-[3rem_minmax(0,1fr)] gap-3 break-keep",
                      line.focus ? "rounded-xl bg-surface-container-low py-3 pr-3 text-body-xl text-on-surface" : "text-body-lg text-on-surface-variant/80",
                    )}
                  >
                    <span className={cn("pt-1 text-right text-label-md tabular-nums", line.focus ? "text-primary" : "text-outline")}>
                      {formatDuration(line.startSec)}
                    </span>
                    <p>{line.focus ? <Highlighted text={line.text} highlight={DEMO_ISSUE.highlight} /> : line.text}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-4 border-t border-outline-variant/60 p-5 sm:p-7 lg:border-t-0">
              <h3 className="text-label-lg text-on-surface-variant">AI 관중 · 이 순간의 반응</h3>
              <ul className="divide-y divide-outline-variant/60">
                {DEMO_FOCUS.listeners.map((listener) => {
                  const Icon = PERSONA_ICON[listener.kind];
                  const reception = RECEPTION_META[listener.reception];
                  const ReceptionIcon = reception.icon;
                  return (
                    <li key={listener.personaId} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", PERSONA_STYLE[listener.kind].chip)}>
                        <Icon aria-hidden className="size-[1.125rem]" />
                      </span>
                      <div className="min-w-0 space-y-1">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-label-lg text-on-surface">{listener.name}</span>
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-md", reception.chip)}>
                            <ReceptionIcon aria-hidden className="size-3.5" />
                            {reception.label}
                          </span>
                        </p>
                        {listener.evidence && <p className="text-body-md text-on-surface-variant break-keep">“{listener.evidence}”</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="grid border-t border-outline-variant/60 md:grid-cols-2">
            <div className="space-y-2 p-5 sm:p-7 md:border-r md:border-outline-variant/60">
              <h3 className="flex items-center gap-2 text-label-lg text-primary">
                <Users aria-hidden className="size-4" />
                공통 신호
              </h3>
              <p className="text-headline-sm text-on-surface break-keep">{COMMON_SIGNAL}</p>
              <p className="text-body-md text-on-surface-variant break-keep">{DEMO_ISSUE.reason}</p>
            </div>
            <div className="space-y-2 border-t border-outline-variant/60 bg-surface-container-low p-5 sm:p-7 md:border-t-0">
              <h3 className="flex items-center gap-2 text-label-lg text-primary">
                <Lightbulb aria-hidden className="size-4" />
                추천 개선
              </h3>
              <p className="text-headline-sm text-on-surface break-keep">{DEMO_ISSUE.improvement.suggestion}</p>
              {DEMO_ISSUE.improvement.rewrite && (
                <p className="border-l-2 border-primary pl-3 text-body-md text-on-surface-variant break-keep">
                  <span className="sr-only">바꿔 말한 예: </span>
                  {DEMO_ISSUE.improvement.rewrite}
                </p>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      <p className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-body-md text-on-surface-variant">예시 데이터이며, 실제 녹음을 분석한 결과가 아닙니다.</span>
        <Link
          href="/result/sample"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-label-lg text-primary underline-offset-4 hover:underline"
        >
          전체 예시 리포트 보기
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </p>
    </section>
  );
}
