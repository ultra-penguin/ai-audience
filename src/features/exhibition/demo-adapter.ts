import { AnalysisResultSchema, type AnalysisResult, type HeatmapCell, type MapSection, type Persona } from "@/shared/api/types";
import { heatmapIndex, mapSections } from "@/features/result/story";
import { DEMO_CATALOG, DEMO_IDS, isExhibitionDemoId as isCatalogDemoId } from "@/features/demo";
import type { DemoId, ExhibitionDemo as CatalogDemo } from "@/features/demo";

/**
 * Narrow contract between exhibition demo data and the exhibition UI.
 *
 * The UI only reads `ExhibitionDemo`. Its source is the central offline catalog;
 * everything the simulation shows is derived from the shared `AnalysisResult`, so
 * the screen can never claim something the report doesn't.
 */

export const EXHIBITION_DEMO_IDS = DEMO_IDS;
export type ExhibitionDemoId = DemoId;

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

function sourceFromCatalog(demo: CatalogDemo): ExhibitionDemoSource {
  const excerpt = demo.result.transcript?.segments[0]?.text ?? demo.result.transcript?.text ?? demo.teaser;
  return {
    id: demo.id,
    title: demo.result.title,
    tagline: demo.teaser,
    context: {
      speaker: "학생 발표자",
      situation: demo.audience,
      audience: "서로 다른 배경지식과 관심사를 가진 AI 관중 3명",
      excerpt,
    },
    result: demo.result,
  };
}

const SOURCES: readonly ExhibitionDemoSource[] = DEMO_CATALOG.map(sourceFromCatalog);

export function isExhibitionDemoId(id: string): id is ExhibitionDemoId {
  return isCatalogDemoId(id);
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
