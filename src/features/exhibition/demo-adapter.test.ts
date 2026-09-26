import { describe, expect, it } from "vitest";
import { AnalysisResultSchema } from "@/shared/api/types";
import { EXHIBITION_DEMO_IDS, getExhibitionDemo, isExhibitionDemoId, listExhibitionDemos } from "./demo-adapter";

describe("exhibition demo adapter", () => {
  it("lists exactly the three agreed demos in order", () => {
    expect(listExhibitionDemos().map((d) => d.id)).toEqual(["bfs", "ai-ethics", "school-project"]);
    expect([...EXHIBITION_DEMO_IDS]).toEqual(["bfs", "ai-ethics", "school-project"]);
  });

  it("returns null for unknown or malformed ids", () => {
    for (const id of ["", "sample", "BFS", "bfs/", "../bfs", "constructor", "__proto__"]) {
      expect(isExhibitionDemoId(id)).toBe(false);
      expect(getExhibitionDemo(id)).toBeNull();
    }
  });

  it.each(EXHIBITION_DEMO_IDS)("%s is a labelled sample that parses as the shared AnalysisResult", (id) => {
    const demo = getExhibitionDemo(id)!;
    expect(AnalysisResultSchema.safeParse(demo.result).success).toBe(true);
    expect(demo.result.isSample).toBe(true);
    expect(demo.context.excerpt.length).toBeGreaterThan(0);
  });

  it.each(EXHIBITION_DEMO_IDS)("%s gives the simulation every section with one reaction per listener", (id) => {
    const demo = getExhibitionDemo(id)!;
    expect(demo.sections.length).toBeGreaterThanOrEqual(3);
    for (const s of demo.sections) expect(s.reactions).toHaveLength(demo.result.personas.length);
    expect(demo.focusIndex).toBeGreaterThanOrEqual(0);
  });

  it.each(EXHIBITION_DEMO_IDS)("%s references only ids that exist in its own result", (id) => {
    const { result } = getExhibitionDemo(id)!;
    const personas = new Set(result.personas.map((p) => p.id));
    const difficult = new Set(result.difficultSections.map((d) => d.id));
    const segments = new Set(result.transcript!.segments.map((s) => s.id));
    const sections = new Set(result.presentationMap!.sections.map((s) => s.id));
    expect(result.summary.priorityFixSectionId && difficult.has(result.summary.priorityFixSectionId)).toBe(true);
    for (const f of result.personaFeedback) {
      expect(personas.has(f.personaId)).toBe(true);
      for (const d of f.difficultSectionIds) expect(difficult.has(d)).toBe(true);
    }
    for (const d of result.difficultSections) {
      expect(segments.has(d.id)).toBe(true);
      if (d.highlight) expect(d.transcript).toContain(d.highlight);
      for (const r of d.reactions) expect(personas.has(r.personaId)).toBe(true);
    }
    for (const s of result.presentationMap!.sections) {
      for (const seg of s.segmentIds ?? []) expect(segments.has(seg)).toBe(true);
      for (const d of s.difficultSectionIds ?? []) expect(difficult.has(d)).toBe(true);
    }
    for (const item of [...result.missingExplanations, ...result.exampleSuggestions]) {
      expect(sections.has(item.sectionId!)).toBe(true);
      for (const p of item.personaIds) expect(personas.has(p)).toBe(true);
    }
    for (const m of result.keyMoments ?? []) {
      expect(sections.has(m.sectionId!)).toBe(true);
      if (m.difficultSectionId) expect(difficult.has(m.difficultSectionId)).toBe(true);
    }
  });
});
