"use client";

import { ArrowDown, FileText } from "lucide-react";
import type { AnalysisResult, MapSection, Persona, Reception } from "@/shared/api/types";
import { useResultUiStore } from "@/features/result/result-ui-store";
import {
  audienceSplits,
  biggestDiscovery,
  heatmapIndex,
  linkableSegmentIds,
  mapSections,
  scriptAnchor,
} from "@/features/result/story";
import { PersonaChip } from "@/components/ui/persona-chip";
import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn, formatDuration } from "@/lib/utils";
import { BeforeAfter } from "./improvements-section";
import { ReportHeading, SectionLink } from "./report-parts";

export const RECEPTION: Record<Reception, { label: string; short: string; cell: string }> = {
  clear: { label: "따라왔어요", short: "따라옴", cell: "bg-secondary-fixed/45 text-on-secondary-fixed" },
  partial: { label: "일부 놓쳤어요", short: "일부", cell: "bg-tertiary-fixed/80 text-on-tertiary-fixed" },
  lost: { label: "놓쳤어요", short: "놓침", cell: "bg-error-container text-on-error-container" },
};

const mapAnchor = (id: string) => `map-${id}`;

function timeRange(s: MapSection) {
  if (s.startSec === undefined) return null;
  return s.endSec !== undefined ? `${formatDuration(s.startSec)}–${formatDuration(s.endSec)}` : formatDuration(s.startSec);
}

/** Link into the full script. The hash works without JS; with JS it also opens and marks the passage. */
function ScriptLink({ segmentIds, children }: { segmentIds: string[]; children: React.ReactNode }) {
  const focusScript = useResultUiStore((s) => s.focusScript);
  return (
    <a
      href={`#${scriptAnchor(segmentIds[0])}`}
      onClick={() => focusScript(segmentIds)}
      className="inline-flex items-center gap-1 rounded text-label-md text-primary underline-offset-4 hover:underline"
    >
      <FileText aria-hidden className="size-3.5" />
      {children}
    </a>
  );
}

/**
 * The single biggest discovery, right after the headline. Rendered only when
 * the backend wrote one or the heatmap shows a clear split.
 */
export function DiscoverySection({ result }: { result: AnalysisResult }) {
  const discovery = biggestDiscovery(result);
  if (!discovery) return null;
  const byId = new Map(result.personas.map((p) => [p.id, p]));
  const people = (discovery.personaIds ?? []).map((id) => byId.get(id)).filter((p): p is Persona => Boolean(p));
  const { section, difficult } = discovery;
  const isPriority = difficult?.id === result.summary.priorityFixSectionId;

  return (
    <section aria-labelledby="discovery-title" className="space-y-6 border-y-2 border-primary py-8 sm:py-10">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="discovery-title" className="text-label-lg text-primary">
          가장 큰 발견
        </h2>
        <span className="text-body-sm text-on-surface-variant">
          · {discovery.reported ? "관중 반응을 서로 맞대어 본 결과" : "구간별 관중 반응에서 읽은 차이"}
        </span>
      </div>
      <p className="max-w-3xl text-headline-md text-on-surface text-pretty">{discovery.headline}</p>
      {discovery.detail && <p className="max-w-2xl text-body-lg text-on-surface-variant">{discovery.detail}</p>}

      {people.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {people.map((p) => (
            <PersonaChip key={p.id} persona={p} />
          ))}
        </div>
      )}

      {difficult && !isPriority && <BeforeAfter section={difficult} />}

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {section && (
          <a href={`#${mapAnchor(section.id)}`} className="rounded text-label-md text-primary underline-offset-4 hover:underline">
            발표 지도에서 ‘{section.title}’ 보기
          </a>
        )}
        {difficult && <SectionLink sectionId={difficult.id}>관중 반응 자세히 보기</SectionLink>}
        {difficult && isPriority && (
          <a href={`#fix-${difficult.id}`} className="inline-flex items-center gap-1 rounded text-label-md text-primary underline-offset-4 hover:underline">
            고치는 방법 보기
            <ArrowDown aria-hidden className="size-3.5" />
          </a>
        )}
      </div>
    </section>
  );
}

function Legend() {
  return (
    <ul aria-label="범례" className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-on-surface-variant">
      {(Object.keys(RECEPTION) as Reception[]).map((r) => (
        <li key={r} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn("size-3 rounded-sm", RECEPTION[r].cell)} />
          {RECEPTION[r].label}
        </li>
      ))}
    </ul>
  );
}

/** Persona × section grid. Each cell carries its label, not just a colour. */
function Heatmap({ result, sections }: { result: AnalysisResult; sections: MapSection[] }) {
  const index = heatmapIndex(result);
  return (
    <div className="space-y-3">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[20rem] border-separate border-spacing-1 text-left">
          <caption className="sr-only">관중별·구간별 이해 정도</caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">관중</span>
              </th>
              {sections.map((s, i) => (
                <th key={s.id} scope="col" className="px-1 pb-1 align-bottom text-label-md font-medium text-on-surface-variant">
                  <a href={`#${mapAnchor(s.id)}`} className="rounded hover:text-on-surface">
                    <span aria-hidden className="tabular-nums">{i + 1}. </span>
                    {s.title}
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.personas.map((p) => (
              <tr key={p.id}>
                <th scope="row" className="whitespace-nowrap pr-2 text-label-md font-medium text-on-surface">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className={cn("size-1.5 rounded-full", PERSONA_STYLE[p.kind].dot)} />
                    {p.name}
                  </span>
                </th>
                {sections.map((s) => {
                  const cell = index.get(`${s.id}:${p.id}`);
                  return (
                    <td
                      key={s.id}
                      title={cell?.evidence}
                      className={cn(
                        "h-10 rounded-md px-2 text-center text-label-md",
                        cell ? RECEPTION[cell.reception].cell : "bg-surface-container text-on-surface-variant",
                      )}
                    >
                      {cell ? RECEPTION[cell.reception].short : <span aria-label="정보 없음">–</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Legend />
    </div>
  );
}

/** Where the same words landed differently, with each listener's evidence. */
function Splits({ result }: { result: AnalysisResult }) {
  const splits = audienceSplits(result).slice(0, 3);
  if (splits.length === 0) return null;
  const byId = new Map(result.personas.map((p) => [p.id, p]));
  return (
    <div className="space-y-4">
      <h3 className="text-headline-sm text-on-surface">관중 반응이 갈린 곳</h3>
      <ul className="space-y-3">
        {splits.map(({ section, cells }) => (
          <li key={section.id} className="space-y-3 border-t border-outline-variant/60 py-5 first:border-t-0">
            <p className="flex flex-wrap items-baseline gap-2">
              <a href={`#${mapAnchor(section.id)}`} className="rounded text-label-lg text-on-surface underline-offset-4 hover:underline">
                {section.title}
              </a>
              {timeRange(section) && <span className="text-label-md tabular-nums text-on-surface-variant">{timeRange(section)}</span>}
            </p>
            <ul className="grid gap-3 md:grid-cols-3">
              {cells.map((c) => {
                const persona = byId.get(c.personaId);
                if (!persona) return null;
                return (
                  <li key={c.personaId} className="space-y-1.5">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <PersonaChip persona={persona} />
                      <span className={cn("rounded px-1.5 py-0.5 text-label-sm", RECEPTION[c.reception].cell)}>{RECEPTION[c.reception].label}</span>
                    </p>
                    {c.evidence && <p className="text-body-md text-on-surface">“{c.evidence}”</p>}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The talk's structure in speaking order, with audience reception per section
 * and anchors into the difficult-section reader and the full script.
 */
export function PresentationMapSection({ result, number }: { result: AnalysisResult; number: number }) {
  const sections = mapSections(result);
  if (sections.length === 0) return null;
  const hasHeatmap = heatmapIndex(result).size > 0;
  const difficultIds = new Set(result.difficultSections.map((s) => s.id));

  return (
    <section aria-labelledby="map-title" className="space-y-6">
      <ReportHeading id="map-title" number={number} title="발표 지도">
        발표를 흐름에 따라 {sections.length}개 구간으로 나눴어요.
        {hasHeatmap ? " 구간마다 관중이 얼마나 따라왔는지 함께 보여드려요." : ""}
      </ReportHeading>

      {hasHeatmap && <Heatmap result={result} sections={sections} />}

      <ol className="space-y-2">
        {sections.map((s, i) => {
          const segmentIds = linkableSegmentIds(result, s);
          const difficult = (s.difficultSectionIds ?? []).filter((id) => difficultIds.has(id));
          return (
            <li
              key={s.id}
              id={mapAnchor(s.id)}
              className="grid scroll-mt-24 grid-cols-[1.75rem_1fr] gap-3 border-t border-outline-variant/50 py-5 target:bg-surface-container-low sm:p-6"
            >
              <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-surface-container text-label-md tabular-nums text-on-surface-variant">
                {i + 1}
              </span>
              <div className="min-w-0 space-y-1.5">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-label-lg text-on-surface">{s.title}</span>
                  {timeRange(s) && <span className="text-label-md tabular-nums text-on-surface-variant">{timeRange(s)}</span>}
                </p>
                {s.summary && <p className="text-body-md text-on-surface-variant">{s.summary}</p>}
                {(segmentIds.length > 0 || difficult.length > 0) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                    {segmentIds.length > 0 && <ScriptLink segmentIds={segmentIds}>스크립트에서 보기</ScriptLink>}
                    {difficult.length > 0 && <SectionLink sectionId={difficult[0]}>막힌 구간 {difficult.length}곳 보기</SectionLink>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {hasHeatmap && <Splits result={result} />}
    </section>
  );
}
