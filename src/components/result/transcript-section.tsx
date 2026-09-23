import type { AnalysisResult } from "@/shared/api/types";
import { cn, formatDuration } from "@/lib/utils";
import { SectionLink } from "./report-parts";

/** Full speech-to-text output, collapsed by default so the feedback stays first. */
export function TranscriptSection({ result }: { result: AnalysisResult }) {
  const { transcript } = result;
  if (!transcript || (!transcript.text.trim() && transcript.segments.length === 0)) return null;
  const difficultIds = new Set(result.difficultSections.map((s) => s.id));

  return (
    <section aria-labelledby="transcript-title">
      <details className="group rounded-xl bg-surface-container-low px-5 py-4">
        <summary className="cursor-pointer list-none marker:hidden">
          <span className="inline-flex items-center gap-2">
            <h2 id="transcript-title" className="text-label-lg text-on-surface">
              전체 스크립트 보기
            </h2>
            <span aria-hidden className="text-on-surface-variant transition-transform group-open:rotate-90">›</span>
          </span>
        </summary>
        {transcript.segments.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {transcript.segments.map((segment) => {
              const difficult = difficultIds.has(segment.id);
              return (
                <li key={segment.id} className={cn("flex gap-3 rounded-lg", difficult && "-mx-2 bg-error-container/35 px-2 py-1.5")}>
                  <span className="h-fit shrink-0 rounded bg-surface-container px-1.5 py-0.5 text-label-md tabular-nums text-on-surface-variant">
                    {formatDuration(segment.startSec)}
                  </span>
                  <p className={cn("text-body-md", difficult ? "text-on-surface" : "text-on-surface-variant")}>
                    {segment.text}
                    {difficult && (
                      <SectionLink sectionId={segment.id} className="ml-2">
                        막힌 구간 보기
                      </SectionLink>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-4 whitespace-pre-line text-body-md text-on-surface-variant">{transcript.text}</p>
        )}
      </details>
    </section>
  );
}
