"use client";

import { useEffect, useRef } from "react";
import type { AnalysisResult } from "@/shared/api/types";
import { useResultUiStore } from "@/features/result/result-ui-store";
import { scriptAnchor } from "@/features/result/story";
import { cn, formatDuration } from "@/lib/utils";
import { SectionLink } from "./report-parts";

const ANCHOR_PREFIX = scriptAnchor("");

/**
 * Full speech-to-text output, collapsed by default so the feedback stays first.
 * Presentation-map links (#script-…) open it and mark the passage they point at.
 */
export function TranscriptSection({ result }: { result: AnalysisResult }) {
  const { transcript } = result;
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const { scriptFocusIds, focusScript } = useResultUiStore();

  // Deep links and back/forward navigation to a script anchor.
  useEffect(() => {
    const ids = new Set(transcript?.segments.map((s) => s.id) ?? []);
    const sync = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (!hash.startsWith(ANCHOR_PREFIX)) return;
      const id = hash.slice(ANCHOR_PREFIX.length);
      // Keep a wider selection made by a map link that points at its first segment.
      if (ids.has(id) && !useResultUiStore.getState().scriptFocusIds.includes(id)) focusScript([id]);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [transcript, focusScript]);

  useEffect(() => {
    if (scriptFocusIds.length === 0 || !detailsRef.current) return;
    detailsRef.current.open = true;
    requestAnimationFrame(() => document.getElementById(scriptAnchor(scriptFocusIds[0]))?.scrollIntoView({ block: "start" }));
  }, [scriptFocusIds]);

  if (!transcript || (!transcript.text.trim() && transcript.segments.length === 0)) return null;
  const difficultIds = new Set(result.difficultSections.map((s) => s.id));
  const focused = new Set(scriptFocusIds);

  return (
    <section aria-labelledby="transcript-title">
      <details ref={detailsRef} className="group rounded-xl bg-surface-container-low px-5 py-4">
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
              const isFocused = focused.has(segment.id);
              return (
                <li
                  key={segment.id}
                  id={scriptAnchor(segment.id)}
                  aria-current={isFocused ? "location" : undefined}
                  className={cn(
                    "flex scroll-mt-24 gap-3 rounded-lg border-l-[3px] border-transparent",
                    (difficult || isFocused) && "-mx-2 px-2 py-1.5",
                    difficult && "bg-error-container/35",
                    isFocused && "border-primary-container",
                    isFocused && !difficult && "bg-surface-container-lowest",
                  )}
                >
                  <span className="h-fit shrink-0 rounded bg-surface-container px-1.5 py-0.5 text-label-md tabular-nums text-on-surface-variant">
                    {formatDuration(segment.startSec)}
                  </span>
                  <p className={cn("text-body-md", difficult || isFocused ? "text-on-surface" : "text-on-surface-variant")}>
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
