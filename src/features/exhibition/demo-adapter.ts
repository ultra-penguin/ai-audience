import { AnalysisResultSchema, type AnalysisResult, type HeatmapCell, type MapSection, type Persona } from "@/shared/api/types";
import { heatmapIndex, mapSections } from "@/features/result/story";
import { FALLBACK_DEMOS } from "./fallback-demos";

/**
 * Narrow contract between exhibition demo data and the exhibition UI.
 *
 * The UI only reads `ExhibitionDemo`. Its data source is `FALLBACK_DEMOS` until the
 * data worker's `demo-catalog.ts` (DEMO_CATALOG / getExhibitionDemo) lands; at that
 * point only `SOURCES` below changes. Everything the simulation shows is derived from
 * the shared `AnalysisResult`, so the screen can never claim something the report doesn't.
 */

export const EXHIBITION_DEMO_IDS = ["bfs", "ai-ethics", "school-project"] as const;
export type ExhibitionDemoId = (typeof EXHIBITION_DEMO_IDS)[number];

/** What a data source must supply for one demo. */
export type ExhibitionDemoSource = {
  id: ExhibitionDemoId;
  /** Short card title, e.g. "BFS 알고리즘 설명". */
  title: string;
  /** One line under the title on the picker. */
  tagline: string;
  /** Shown during the short context preview before the simulation. */
  context: {
    speaker: string;
    situation: string;
    audience: string;
    /** A line from the talk, quoted verbatim. */
    excerpt: string;
  };
  result: AnalysisResult;
};

/** One presentation-map section with how each listener received it. */
export type SimulationSection = {
  section: MapSection;
  /** One entry per persona, in persona order; missing cells are omitted. */
  reactions: { persona: Persona; cell: HeatmapCell }[];
};

export type ExhibitionDemo = ExhibitionDemoSource & {
  sections: SimulationSection[];
  /** Index into `sections` the cross-check step points at, or -1. */
  focusIndex: number;
};

const SOURCES: readonly ExhibitionDemoSource[] = FALLBACK_DEMOS;

export function isExhibitionDemoId(id: string): id is ExhibitionDemoId {
  return (EXHIBITION_DEMO_IDS as readonly string[]).includes(id);
}

function toDemo(source: ExhibitionDemoSource): ExhibitionDemo {
  // Parse with the same schema the API clients use, so demo data can't drift from the report's contract.
  const result = AnalysisResultSchema.parse(source.result);
  const index = heatmapIndex(result);
  const sections = mapSections(result).map((section) => ({
    section,
    reactions: result.personas.flatMap((persona) => {
      const cell = index.get(`${section.id}:${persona.id}`);
      return cell ? [{ persona, cell }] : [];
    }),
  }));
  const focusIndex = sections.findIndex((s) => s.section.id === result.discovery?.sectionId);
  return { ...source, result, sections, focusIndex };
}

let cache: ExhibitionDemo[] | undefined;

/** All demos in picker order. */
export function listExhibitionDemos(): ExhibitionDemo[] {
  cache ??= EXHIBITION_DEMO_IDS.flatMap((id) => {
    const source = SOURCES.find((s) => s.id === id);
    return source ? [toDemo(source)] : [];
  });
  return cache;
}

/** The demo for a route param, or null for anything that isn't a known id. */
export function getExhibitionDemo(id: string): ExhibitionDemo | null {
  if (!isExhibitionDemoId(id)) return null;
  return listExhibitionDemos().find((d) => d.id === id) ?? null;
}
