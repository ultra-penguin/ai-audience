"use client";

import { useEffect, type KeyboardEvent } from "react";
import type { AnalysisResult, DifficultSection } from "@/shared/api/types";
import { useResultUiStore } from "@/features/result/result-ui-store";
import { resolveSelected, sectionsByTime } from "@/features/result/report";
import { Card } from "@/components/ui/card";
import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn, formatDuration } from "@/lib/utils";
import { CATEGORY_LABEL, FeedbackChain, Highlighted } from "./feedback-chain";
import { ReportHeading, SectionLink } from "./report-parts";

const SEVERITY_LABEL: Record<DifficultSection["severity"], string> = {
  high: "여러 관중이 크게 막힘",
  medium: "일부 관중이 막힘",
  low: "살짝 걸림",
};

const DETAIL_ID = "section-detail";

function Timeline({
  sections,
  durationSec,
  priorityId,
  selectedId,
}: {
  sections: DifficultSection[];
  durationSec: number;
  priorityId?: string;
  selectedId?: string;
}) {
  const total = Math.max(durationSec, ...sections.map((s) => s.endSec), 1);
  return (
    <div className="space-y-2">
      <div className="relative h-8">
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-container-highest" />
        <ol aria-label="발표 시간대별 막힌 지점">
          {sections.map((s) => {
            const left = (s.startSec / total) * 100;
            const width = Math.max(((s.endSec - s.startSec) / total) * 100, 1.5);
            const selected = s.id === selectedId;
            return (
              <li key={s.id}>
                <SectionLink
                  sectionId={s.id}
                  className="group absolute top-0 flex h-8 min-w-6 items-center"
                  style={{ left: `${Math.min(left, 100 - width)}%`, width: `${width}%` }}
                  aria-label={`${formatDuration(s.startSec)} ${CATEGORY_LABEL[s.category]}, 관중 ${s.reactions.length}명`}
                  aria-current={selected ? "true" : undefined}
                >
                  <span
                    className={cn(
                      "w-full rounded-full transition-[height] duration-200 group-hover:h-3",
                      selected ? "h-3.5 ring-2 ring-surface-container-lowest" : "h-2",
                      s.id === priorityId ? "bg-error" : s.severity === "high" ? "bg-error/70" : "bg-tertiary-fixed-dim",
                    )}
                  />
                </SectionLink>
              </li>
            );
          })}
        </ol>
      </div>
      <div aria-hidden className="flex justify-between text-label-sm tabular-nums text-on-surface-variant">
        <span>0:00</span>
        <span>{formatDuration(total)}</span>
      </div>
    </div>
  );
}

function PersonaFilter({ result }: { result: AnalysisResult }) {
  const { personaFilter, setPersonaFilter } = useResultUiStore();
  const options: { id: string | null; label: string; dot?: string }[] = [
    { id: null, label: "모든 관중" },
    ...result.personas.map((p) => ({ id: p.id, label: p.name, dot: PERSONA_STYLE[p.kind].dot })),
  ];

  return (
    <div role="group" aria-label="관중별로 보기" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {options.map((o) => {
        const selected = personaFilter === o.id;
        return (
          <button
            key={o.id ?? "all"}
            type="button"
            aria-pressed={selected}
            onClick={() => setPersonaFilter(o.id)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-label-md transition-colors",
              selected
                ? "bg-inverse-surface text-inverse-on-surface"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
            )}
          >
            {o.dot && <span aria-hidden className={cn("size-1.5 rounded-full", o.dot)} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionDetail({ section, result }: { section: DifficultSection; result: AnalysisResult }) {
  return (
    <div key={section.id} className="animate-rise-in motion-reduce:animate-none">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="rounded bg-surface-container px-1.5 py-0.5 text-label-md tabular-nums text-on-surface-variant">
          {formatDuration(section.startSec)}
        </span>
        <span className="text-label-lg text-on-surface">{CATEGORY_LABEL[section.category]}</span>
        <span className="text-body-sm text-on-surface-variant">· {SEVERITY_LABEL[section.severity]}</span>
      </div>
      <FeedbackChain section={section} personas={result.personas} />
      <a
        href={`#fix-${section.id}`}
        className="mt-5 inline-flex rounded text-label-lg text-primary underline-offset-4 hover:underline"
      >
        고칠 목록에서 보기
      </a>
    </div>
  );
}

/**
 * Transcript reader: difficult passages in talk order on one side, the
 * selected passage's audience → reason → repair chain on the other. On small
 * screens the chain opens directly under the selected passage.
 */
export function DifficultSections({ result, number }: { result: AnalysisResult; number: number }) {
  const { personaFilter, selectedSectionId, selectSection, focusSection } = useResultUiStore();
  const sections = sectionsByTime(result.difficultSections);
  const visible = personaFilter ? sections.filter((s) => s.reactions.some((r) => r.personaId === personaFilter)) : sections;
  const priorityId = result.summary.priorityFixSectionId;
  const selected = resolveSelected(visible, selectedSectionId, priorityId);
  const filterName = result.personas.find((p) => p.id === personaFilter)?.name;

  // Deep links (#sec-…) and back/forward navigation open the matching section.
  useEffect(() => {
    const ids = new Set(result.difficultSections.map((s) => s.id));
    const sync = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (ids.has(hash)) focusSection(hash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [result.difficultSections, focusSection]);

  const onListKeyDown = (e: KeyboardEvent<HTMLOListElement>) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-section-id]"));
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    e.preventDefault();
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : (at + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
    selectSection(buttons[next].dataset.sectionId ?? null);
  };

  return (
    <section aria-labelledby="sections-title" className="space-y-6">
      <ReportHeading
        id="sections-title"
        number={number}
        title={
          <>
            막힌 구간 {sections.length > 0 && <span className="text-on-surface-variant">{sections.length}곳</span>}
          </>
        }
      >
        발표에서 관중이 멈칫한 문장이에요. 구간을 고르면 누가, 왜 막혔고 어떻게 고치면 되는지 이어서 보여드려요.
      </ReportHeading>

      {sections.length === 0 ? (
        <div className="rounded-xl bg-surface-container-low p-6 text-center">
          <p className="text-headline-sm text-on-surface">크게 막힌 지점을 찾지 못했어요</p>
          <p className="mx-auto mt-2 max-w-md text-body-md text-on-surface-variant">
            모든 관중이 흐름을 따라왔어요. 실제 청중이 더 낯설어할 만한 내용이 있다면, 그 부분을 넣어 다시 녹음해 보세요.
          </p>
        </div>
      ) : (
        <>
          <Timeline sections={sections} durationSec={result.durationSec} priorityId={priorityId} selectedId={selected?.id} />
          <PersonaFilter result={result} />
          <p aria-live="polite" className="sr-only">
            {filterName ? `${filterName} 기준 ${visible.length}곳` : `전체 ${visible.length}곳`}
          </p>

          {visible.length === 0 || !selected ? (
            <p className="rounded-xl bg-surface-container-low p-5 text-body-md text-on-surface-variant">
              {filterName}은(는) 막힌 곳 없이 따라왔어요.
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
              <ol aria-label="막힌 구간 목록" onKeyDown={onListKeyDown} className="space-y-2">
                {visible.map((s) => {
                  const isSelected = s.id === selected.id;
                  return (
                    <li key={s.id} id={s.id} className="scroll-mt-24">
                      <button
                        type="button"
                        data-section-id={s.id}
                        aria-pressed={isSelected}
                        aria-controls={DETAIL_ID}
                        onClick={() => selectSection(s.id)}
                        className={cn(
                          "w-full rounded-xl border-l-[3px] p-4 text-left transition-colors duration-200",
                          isSelected
                            ? "border-primary-container bg-surface-container-lowest shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-outline-variant/50"
                            : "border-transparent bg-surface-container-low hover:bg-surface-container",
                        )}
                      >
                        <span className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded bg-surface-container px-1.5 py-0.5 text-label-md tabular-nums text-on-surface-variant">
                            {formatDuration(s.startSec)}
                          </span>
                          <span className="text-label-md text-on-surface">{CATEGORY_LABEL[s.category]}</span>
                          <span className="text-label-md text-on-surface-variant">· 관중 {s.reactions.length}명</span>
                          {s.id === priorityId && (
                            <span className="ml-auto rounded bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed">먼저 고칠 곳</span>
                          )}
                        </span>
                        <span className={cn("block text-body-md", isSelected ? "text-on-surface" : "text-on-surface-variant")}>
                          <Highlighted text={s.transcript} highlight={s.highlight} />
                        </span>
                      </button>
                      {isSelected && (
                        <Card className="mt-2 p-5 lg:hidden">
                          <SectionDetail section={s} result={result} />
                        </Card>
                      )}
                    </li>
                  );
                })}
              </ol>

              <Card id={DETAIL_ID} className="hidden p-6 lg:sticky lg:top-24 lg:block">
                <SectionDetail section={selected} result={result} />
              </Card>
            </div>
          )}
        </>
      )}
    </section>
  );
}
