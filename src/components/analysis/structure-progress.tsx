import { Check } from "lucide-react";
import type { AnalysisPipeline, AnalysisStatus, StepState } from "@/shared/api/types";
import { activePersonaId, cellStateFor, orderedSections } from "@/features/analysis/pipeline";
import { PersonaChip } from "@/components/ui/persona-chip";
import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn, formatDuration } from "@/lib/utils";

const CELL_LABEL: Record<StepState, string> = {
  pending: "아직",
  running: "듣는 중",
  done: "들음",
  failed: "멈춤",
  skipped: "건너뜀",
};

function CellMark({ state, dot }: { state: StepState | undefined; dot: string }) {
  const s = state ?? "pending";
  return (
    <span className="inline-flex items-center justify-center" title={CELL_LABEL[s]}>
      <span aria-hidden className="flex size-5 items-center justify-center">
        {s === "done" ? (
          <Check className="size-4 text-secondary" />
        ) : s === "running" ? (
          <span className={cn("size-2.5 animate-pulse rounded-full motion-reduce:animate-none", dot)} />
        ) : s === "failed" ? (
          <span className="text-label-md text-error">!</span>
        ) : (
          <span className="size-2 rounded-full border border-outline-variant" />
        )}
      </span>
      <span className="sr-only">{CELL_LABEL[s]}</span>
    </span>
  );
}

/**
 * The presentation map the structure step produced, with one column per
 * persona. Cells show only states the backend reported; unreported pairs read "아직".
 */
export function StructureProgress({ status }: { status: AnalysisStatus }) {
  const pipeline = status.pipeline!;
  const sections = orderedSections(pipeline.sections);
  if (sections.length === 0) return null;
  const personas = pipeline.personas ?? [];
  const live = status.stage !== "failed" && status.stage !== "completed";
  const currentId = live ? pipeline.currentSectionId : null;
  const activePersona = activePersonaId(status);

  return (
    <section aria-labelledby="map-progress-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="map-progress-title" className="text-headline-sm text-on-surface">
          발표 지도
        </h2>
        <p className="text-body-sm text-on-surface-variant">구간 {sections.length}개</p>
      </div>
      <div className="overflow-hidden border-y border-outline-variant/60">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">구간별 관중 진행 상황</caption>
          <thead>
            <tr className="border-b border-outline-variant/50">
              <th scope="col" className="px-3 py-2 text-label-md text-on-surface-variant">
                구간
              </th>
              {personas.map((p) => (
                <th
                  key={p.id}
                  scope="col"
                  className={cn("w-14 px-1 py-2.5 text-center text-label-md sm:w-24", p.id === activePersona ? "text-on-surface" : "text-on-surface-variant")}
                >
                  <span aria-hidden className={cn("mx-auto mb-1 block size-1.5 rounded-full", PERSONA_STYLE[p.kind].dot)} />
                  {/* Full names wrap into three cramped columns on phones; the seats above spell them out. */}
                  <span className="sm:hidden">
                    <span aria-hidden>{p.name.slice(0, 2)}</span>
                    <span className="sr-only">{p.name}</span>
                  </span>
                  <span className="hidden sm:inline">{p.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((s, i) => {
              const current = s.id === currentId;
              return (
                <tr
                  key={s.id}
                  aria-current={current ? "location" : undefined}
                  className={cn("border-b border-outline-variant/30 transition-colors duration-300 last:border-0", current && "bg-surface-container-low")}
                >
                  <th scope="row" className="px-3 py-2 font-normal">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span aria-hidden className="text-label-md tabular-nums text-on-surface-variant">
                        {i + 1}
                      </span>
                      <span className={cn("text-label-lg", current ? "text-on-surface" : "text-on-surface-variant")}>{s.title}</span>
                      {s.startSec !== undefined && (
                        <span className="text-label-sm tabular-nums text-on-surface-variant">{formatDuration(s.startSec)}</span>
                      )}
                      {current && <span className="text-label-sm text-primary">지금</span>}
                    </span>
                  </th>
                  {personas.map((p) => (
                    <td key={p.id} className="px-1 py-2 text-center">
                      <CellMark state={cellStateFor(pipeline, s.id, p.id)} dot={PERSONA_STYLE[p.kind].dot} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const MAX_INSIGHTS = 4;

/** Concise findings the backend has already reported, newest first. */
export function InsightCards({ pipeline }: { pipeline: AnalysisPipeline }) {
  const insights = (pipeline.insights ?? []).slice(-MAX_INSIGHTS).reverse();
  if (insights.length === 0) return null;
  const sections = new Map(pipeline.sections?.map((s) => [s.id, s]));
  const personas = new Map(pipeline.personas?.map((p) => [p.id, p]));
  const total = pipeline.insights?.length ?? 0;

  return (
    <section aria-labelledby="insights-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="insights-title" className="text-headline-sm text-on-surface">
          지금까지 들은 반응
        </h2>
        {total > MAX_INSIGHTS && <p className="text-body-sm text-on-surface-variant">최근 {MAX_INSIGHTS}개 · 전체 {total}개</p>}
      </div>
      <ul className="grid gap-x-8 sm:grid-cols-2">
        {insights.map((ins) => {
          const persona = ins.personaId ? personas.get(ins.personaId) : undefined;
          const section = ins.sectionId ? sections.get(ins.sectionId) : undefined;
          return (
            <li key={ins.id} className="animate-rise-in space-y-1.5 border-t border-outline-variant/60 py-3 motion-reduce:animate-none">
              {(persona || section) && (
                <p className="flex flex-wrap items-center gap-2">
                  {persona && <PersonaChip persona={persona} />}
                  {section && <span className="text-label-md text-on-surface-variant">{section.title}</span>}
                </p>
              )}
              <p className="text-body-md text-on-surface">{ins.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
