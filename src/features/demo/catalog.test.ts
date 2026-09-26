import { describe, expect, it } from "vitest";
import { isApiError } from "@/shared/api/client";
import { AnalysisResultSchema } from "@/shared/api/types";
import { biggestDiscovery, mapSections } from "@/features/result/story";
import { SAMPLE_RESULT } from "@/mocks/sample-result";
import { DEMO_CATALOG, DEMO_IDS, demoTimeline, findDemo, getDemo, getDemoResult, isExhibitionDemoId, listDemos, parseDemo } from "./catalog";

const HANGUL = /[가-힣]/;

describe("exhibition demo catalog", () => {
  it("has exactly the three offline demos, in booth order, with unique ids", () => {
    expect(DEMO_CATALOG.map((d) => d.id)).toEqual(["demo-bfs", "demo-ai-ethics", "demo-recycling"]);
    expect([...DEMO_IDS]).toEqual(DEMO_CATALOG.map((d) => d.id));
    expect(new Set(DEMO_CATALOG.map((d) => d.result.title)).size).toBe(3);
  });

  it("parses every entry against the demo contract", () => {
    for (const demo of DEMO_CATALOG) expect(parseDemo(structuredClone(demo))).toEqual(demo);
  });

  it("rejects entries that break the contract", () => {
    const bfs = getDemo("demo-bfs");
    expect(() => parseDemo({ ...bfs, id: "demo-unknown" })).toThrow();
    expect(() => parseDemo({ ...bfs, commonInsight: undefined })).toThrow();
    expect(() => parseDemo({ ...bfs, result: { ...bfs.result, personas: [] } })).toThrow();
  });

  it("does not collide with the existing mock demo ids", () => {
    for (const id of ["sample", "demo-script", "demo-empty", "demo-failed", "demo-legacy"]) expect(isExhibitionDemoId(id)).toBe(false);
  });

  it("returns a not_found ApiError for an unknown id", () => {
    expect(findDemo("demo-nope")).toBeUndefined();
    expect(isExhibitionDemoId("demo-nope")).toBe(false);
    for (const call of [() => getDemo("demo-nope"), () => getDemoResult("")]) {
      try {
        call();
        expect.unreachable();
      } catch (error) {
        expect(isApiError(error) && error.code).toBe("not_found");
      }
    }
  });

  it("lists picker cards that point at the result screen", () => {
    const cards = listDemos();
    expect(cards.map((c) => c.href)).toEqual(["/result/demo-bfs", "/result/demo-ai-ethics", "/result/demo-recycling"]);
    for (const card of cards) expect(card.personas).toHaveLength(3);
  });

  it("hands out independent copies of each result", () => {
    const a = getDemoResult("demo-bfs");
    a.personas[0]!.name = "changed";
    expect(getDemoResult("demo-bfs").personas[0]!.name).not.toBe("changed");
  });
});

describe.each(DEMO_CATALOG.map((demo) => [demo.id, demo] as const))("%s", (id, demo) => {
  const { result } = demo;
  const segments = result.transcript!.segments;
  const segmentById = new Map(segments.map((s) => [s.id, s]));
  const sections = result.presentationMap!.sections;
  const sectionIds = new Set(sections.map((s) => s.id));
  const personaIds = new Set(result.personas.map((p) => p.id));
  const difficultIds = new Set(result.difficultSections.map((s) => s.id));

  it("is a complete AnalysisResult the current ResultView can consume", () => {
    const parsed = AnalysisResultSchema.parse(structuredClone(result));
    expect(parsed).toEqual(result);
    expect(result.presentationId).toBe(id);
    expect(result.isSample).toBe(true);
    for (const key of ["transcript", "presentationMap", "audienceHeatmap", "discovery", "keyMoments", "naturalQuestions"] as const) {
      expect(result[key], key).toBeDefined();
    }
    expect(result.difficultSections.length).toBeGreaterThan(0);
    expect(result.missingExplanations.length).toBeGreaterThan(0);
    expect(result.exampleSuggestions.length).toBeGreaterThan(0);
    // Story helpers used by ResultView resolve without falling back.
    expect(mapSections(result)).toHaveLength(sections.length);
    expect(biggestDiscovery(result)?.reported).toBe(true);
    expect(biggestDiscovery(result)?.difficult?.id).toBe(result.discovery!.difficultSectionId);
  });

  it("has three distinct personas, each with feedback", () => {
    expect(result.personas).toHaveLength(3);
    expect(personaIds.size).toBe(3);
    expect(new Set(result.personas.map((p) => p.kind)).size).toBe(3);
    expect(new Set(result.personas.map((p) => p.name)).size).toBe(3);
    expect(result.personaFeedback.map((f) => f.personaId).sort()).toEqual([...personaIds].sort());
    for (const f of result.personaFeedback) {
      expect(f.reaction).toMatch(HANGUL);
      for (const d of f.difficultSectionIds) expect(difficultIds.has(d)).toBe(true);
    }
  });

  it("has an ordered Korean transcript whose text matches its segments", () => {
    expect(segments.length).toBeGreaterThanOrEqual(6);
    expect(result.transcript!.text).toBe(segments.map((s) => s.text).join(" "));
    expect(segmentById.size).toBe(segments.length);
    segments.forEach((s, i) => {
      expect(s.text).toMatch(HANGUL);
      expect(s.endSec).toBeGreaterThan(s.startSec);
      if (i > 0) expect(s.startSec).toBe(segments[i - 1]!.endSec);
    });
    expect(segments[0]!.startSec).toBe(0);
    expect(segments.at(-1)!.endSec).toBe(result.durationSec);
  });

  it("has a timeline that covers the talk and every segment exactly once", () => {
    expect(sections.length).toBeGreaterThanOrEqual(3);
    expect(sections.flatMap((s) => s.segmentIds)).toEqual(segments.map((s) => s.id));
    sections.forEach((s, i) => {
      const own = s.segmentIds!.map((sid) => segmentById.get(sid)!);
      expect(s.startSec).toBe(own[0]!.startSec);
      expect(s.endSec).toBe(own.at(-1)!.endSec);
      if (i > 0) expect(s.startSec).toBe(sections[i - 1]!.endSec);
    });
    const timeline = demoTimeline(demo);
    expect(timeline.map((t) => t.id)).toEqual(sections.map((s) => s.id));
    for (const t of timeline) {
      expect(t.segments.length).toBeGreaterThan(0);
      expect(t.reception.map((c) => c.personaId)).toEqual(result.personas.map((p) => p.id));
    }
  });

  it("anchors difficult sections to verbatim transcript segments", () => {
    for (const d of result.difficultSections) {
      const seg = segmentById.get(d.id);
      expect(seg, d.id).toBeDefined();
      expect(d.transcript).toBe(seg!.text);
      expect([d.startSec, d.endSec]).toEqual([seg!.startSec, seg!.endSec]);
      expect(seg!.text).toContain(d.highlight!);
      expect(d.reactions.length).toBeGreaterThan(0);
      for (const r of d.reactions) expect(personaIds.has(r.personaId)).toBe(true);
      expect(sections.some((s) => s.difficultSectionIds!.includes(d.id))).toBe(true);
    }
    expect(difficultIds.has(result.summary.priorityFixSectionId!)).toBe(true);
  });

  it("has a reaction with evidence for every persona × section", () => {
    const cells = result.audienceHeatmap!.cells;
    expect(cells).toHaveLength(sections.length * 3);
    for (const s of sections) {
      for (const p of personaIds) {
        const cell = cells.find((c) => c.sectionId === s.id && c.personaId === p);
        expect(cell?.evidence, `${s.id}:${p}`).toMatch(HANGUL);
      }
    }
    // Personas must actually disagree somewhere, or there is nothing to exhibit.
    expect(new Set(cells.map((c) => c.reception)).size).toBeGreaterThan(1);
  });

  it("references only known sections and personas", () => {
    const refs = [
      ...result.keyMoments!.map((m) => ({ section: m.sectionId, difficult: m.difficultSectionId, personas: m.personaIds })),
      ...result.naturalQuestions!.map((q) => ({ section: q.sectionId, difficult: undefined, personas: q.personaIds })),
      { section: result.discovery!.sectionId, difficult: result.discovery!.difficultSectionId, personas: result.discovery!.personaIds ?? [] },
    ];
    for (const ref of refs) {
      if (ref.section) expect(sectionIds.has(ref.section)).toBe(true);
      if (ref.difficult) expect(difficultIds.has(ref.difficult)).toBe(true);
      for (const p of ref.personas) expect(personaIds.has(p)).toBe(true);
    }
    for (const item of [...result.missingExplanations, ...result.exampleSuggestions]) {
      expect(segmentById.has(item.sectionId!)).toBe(true);
      for (const p of item.personaIds) expect(personaIds.has(p)).toBe(true);
    }
  });

  it("has a common insight backed by transcript evidence and an actionable recommendation", () => {
    const { commonInsight, recommendation } = demo;
    expect(sectionIds.has(commonInsight.sectionId)).toBe(true);
    expect(segmentById.get(commonInsight.evidence.segmentId)?.text).toContain(commonInsight.evidence.quote);
    expect(sections.find((s) => s.id === commonInsight.sectionId)!.segmentIds).toContain(commonInsight.evidence.segmentId);
    expect(sectionIds.has(recommendation.sectionId)).toBe(true);
    expect(difficultIds.has(recommendation.difficultSectionId)).toBe(true);
    expect(recommendation.difficultSectionId).toBe(result.summary.priorityFixSectionId);
    expect(recommendation.rewrite).toMatch(/^“.+”$/);
  });

  it("is distinct from the landing sample", () => {
    expect(result.title).not.toBe(SAMPLE_RESULT.title);
  });
});
