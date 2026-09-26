import { ApiError } from "@/shared/api/client";
import { AnalysisResultSchema, type AnalysisResult, type HeatmapCell, type MapSection, type Persona, type TranscriptSegment } from "@/shared/api/types";
import { AI_ETHICS_DEMO } from "./demos/ai-ethics";
import { BFS_DEMO } from "./demos/bfs";
import { RECYCLING_DEMO } from "./demos/recycling";
import { DEMO_IDS, ExhibitionDemoSchema, type DemoId, type ExhibitionDemo } from "./schema";

/**
 * The single source of offline exhibition demos, in the order the booth shows
 * them. Nothing here touches the network or a model: every demo is written in
 * advance and labelled `isSample: true`.
 */
export const DEMO_CATALOG: readonly ExhibitionDemo[] = [BFS_DEMO, AI_ETHICS_DEMO, RECYCLING_DEMO];

const byId = new Map<string, ExhibitionDemo>(DEMO_CATALOG.map((demo) => [demo.id, demo]));

export function isExhibitionDemoId(id: string): id is DemoId {
  return (DEMO_IDS as readonly string[]).includes(id);
}

/** The demo, or undefined for an unknown id. */
export function findDemo(id: string): ExhibitionDemo | undefined {
  return byId.get(id);
}

/** The demo, or a `not_found` ApiError so callers can reuse the result screen's error handling. */
export function getDemo(id: string): ExhibitionDemo {
  const demo = findDemo(id);
  if (!demo) throw new ApiError("not_found", "해당 데모를 찾을 수 없어요.", 404);
  return demo;
}

/** Validates an unknown value against the demo contract (used by tests and any future JSON source). */
export function parseDemo(input: unknown): ExhibitionDemo {
  return ExhibitionDemoSchema.parse(input);
}

/** A fresh, schema-parsed copy of the demo's result, ready for ResultView. */
export function getDemoResult(id: string): AnalysisResult {
  return AnalysisResultSchema.parse(structuredClone(getDemo(id).result));
}

export type DemoSummary = Pick<ExhibitionDemo, "id" | "label" | "audience" | "teaser"> & {
  title: string;
  durationSec: number;
  personas: Pick<Persona, "id" | "kind" | "name">[];
  /** Where the result screen lives for this demo. */
  href: string;
};

/** Cards for a demo picker, in catalog order. */
export function listDemos(): DemoSummary[] {
  return DEMO_CATALOG.map(({ id, label, audience, teaser, result }) => ({
    id,
    label,
    audience,
    teaser,
    title: result.title,
    durationSec: result.durationSec,
    personas: result.personas.map(({ id, kind, name }) => ({ id, kind, name })),
    href: `/result/${id}`,
  }));
}

export type DemoTimelineSection = MapSection & {
  startSec: number;
  endSec: number;
  segments: TranscriptSegment[];
  /** One cell per persona, in persona order. */
  reception: HeatmapCell[];
};

/** Presentation-map sections in speaking order, joined with their transcript and every persona's reception. */
export function demoTimeline(demo: ExhibitionDemo): DemoTimelineSection[] {
  const { result } = demo;
  const segments = new Map(result.transcript?.segments.map((s) => [s.id, s]));
  const cells = result.audienceHeatmap?.cells ?? [];
  return (result.presentationMap?.sections ?? []).map((section) => ({
    ...section,
    startSec: section.startSec ?? 0,
    endSec: section.endSec ?? section.startSec ?? 0,
    segments: (section.segmentIds ?? []).flatMap((id) => segments.get(id) ?? []),
    reception: result.personas.flatMap((p) => cells.find((c) => c.sectionId === section.id && c.personaId === p.id) ?? []),
  }));
}

export { DEMO_IDS, type DemoId, type ExhibitionDemo } from "./schema";
