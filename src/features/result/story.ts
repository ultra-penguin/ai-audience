import type { AnalysisResult, DifficultSection, Discovery, HeatmapCell, MapSection, Reception } from "@/shared/api/types";
import { orderedSections } from "@/features/analysis/pipeline";

/**
 * Phase 4 storytelling helpers. Each returns null/empty when the result has no
 * structured data for it, so legacy and mock-only results render as before.
 */

/** Presentation-map sections in speaking order, or [] when the backend sent none. */
export function mapSections(result: AnalysisResult): MapSection[] {
  return orderedSections(result.presentationMap?.sections);
}

/** Heatmap cells keyed by `${sectionId}:${personaId}`, restricted to known sections and personas. */
export function heatmapIndex(result: AnalysisResult): Map<string, HeatmapCell> {
  const sections = new Set(mapSections(result).map((s) => s.id));
  const personas = new Set(result.personas.map((p) => p.id));
  const index = new Map<string, HeatmapCell>();
  for (const cell of result.audienceHeatmap?.cells ?? []) {
    if (sections.has(cell.sectionId) && personas.has(cell.personaId)) index.set(`${cell.sectionId}:${cell.personaId}`, cell);
  }
  return index;
}

const RECEPTION_RANK: Record<Reception, number> = { clear: 0, partial: 1, lost: 2 };

export type AudienceSplit = {
  section: MapSection;
  cells: HeatmapCell[];
  /** Distance between the best and worst reception: 2 = someone clear while someone lost. */
  gap: number;
};

/** Sections where personas received the same words differently, widest gap first. */
export function audienceSplits(result: AnalysisResult): AudienceSplit[] {
  const index = heatmapIndex(result);
  const splits: AudienceSplit[] = [];
  for (const section of mapSections(result)) {
    const cells = result.personas.flatMap((p) => index.get(`${section.id}:${p.id}`) ?? []);
    if (cells.length < 2) continue;
    const ranks = cells.map((c) => RECEPTION_RANK[c.reception]);
    const gap = Math.max(...ranks) - Math.min(...ranks);
    if (gap > 0) splits.push({ section, cells, gap });
  }
  return splits.sort((a, b) => b.gap - a.gap);
}

export type ResolvedDiscovery = Discovery & {
  section?: MapSection;
  difficult?: DifficultSection;
  /** True when written by the backend's cross-check; false when read off the heatmap. */
  reported: boolean;
};

/**
 * The backend's own discovery when it sent one; otherwise the widest audience
 * split, stated only as what the heatmap shows. Null without structured data.
 */
export function biggestDiscovery(result: AnalysisResult): ResolvedDiscovery | null {
  const sections = mapSections(result);
  const byId = new Map(sections.map((s) => [s.id, s]));
  const difficultById = new Map(result.difficultSections.map((s) => [s.id, s]));
  const personaIds = new Set(result.personas.map((p) => p.id));

  const d = result.discovery;
  if (d && d.headline.trim()) {
    const section = d.sectionId ? byId.get(d.sectionId) : undefined;
    const difficult =
      (d.difficultSectionId ? difficultById.get(d.difficultSectionId) : undefined) ??
      section?.difficultSectionIds?.map((id) => difficultById.get(id)).find(Boolean);
    return { ...d, personaIds: d.personaIds?.filter((id) => personaIds.has(id)), section, difficult, reported: true };
  }

  const split = audienceSplits(result)[0];
  if (!split || split.gap < 2) return null;
  const names = new Map(result.personas.map((p) => [p.id, p.name]));
  const clear = split.cells.filter((c) => c.reception === "clear").map((c) => names.get(c.personaId));
  const lost = split.cells.filter((c) => c.reception === "lost").map((c) => names.get(c.personaId));
  return {
    headline: `‘${split.section.title}’에서 관중 반응이 가장 크게 갈렸어요.`,
    detail: `${clear.join(", ")}은(는) 따라왔지만 ${lost.join(", ")}은(는) 흐름을 놓쳤어요.`,
    sectionId: split.section.id,
    personaIds: split.cells.filter((c) => c.reception !== "partial").map((c) => c.personaId),
    section: split.section,
    difficult: split.section.difficultSectionIds?.map((id) => difficultById.get(id)).find(Boolean),
    reported: false,
  };
}

/** Transcript segment ids a map section can link to, when the transcript has them. */
export function linkableSegmentIds(result: AnalysisResult, section: MapSection): string[] {
  const known = new Set(result.transcript?.segments.map((s) => s.id) ?? []);
  return (section.segmentIds ?? []).filter((id) => known.has(id));
}

export const scriptAnchor = (segmentId: string) => `script-${segmentId}`;
