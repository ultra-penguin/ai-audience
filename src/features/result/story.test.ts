import { describe, expect, it } from "vitest";
import { SAMPLE_RESULT, SAMPLE_RESULT_LEGACY, SAMPLE_RESULT_NO_ISSUES } from "@/mocks/sample-result";
import { audienceSplits, biggestDiscovery, heatmapIndex, linkableSegmentIds, mapSections } from "./story";

describe("result storytelling helpers", () => {
  it("renders nothing extra for legacy results", () => {
    expect(mapSections(SAMPLE_RESULT_LEGACY)).toEqual([]);
    expect(heatmapIndex(SAMPLE_RESULT_LEGACY).size).toBe(0);
    expect(audienceSplits(SAMPLE_RESULT_LEGACY)).toEqual([]);
    expect(biggestDiscovery(SAMPLE_RESULT_LEGACY)).toBeNull();
  });

  it("orders splits by the widest gap between listeners", () => {
    const splits = audienceSplits(SAMPLE_RESULT);
    expect(splits[0].section.id).toBe("map-result");
    expect(splits[0].gap).toBe(2);
    expect(splits.map((s) => s.section.id)).not.toContain("map-problem");
  });

  it("uses the backend discovery and resolves its sections", () => {
    const d = biggestDiscovery(SAMPLE_RESULT)!;
    expect(d.reported).toBe(true);
    expect(d.section?.id).toBe("map-result");
    expect(d.difficult?.id).toBe("sec-metric");
  });

  it("derives a discovery from the heatmap only when someone followed while someone was lost", () => {
    const d = biggestDiscovery({ ...SAMPLE_RESULT, discovery: undefined })!;
    expect(d.reported).toBe(false);
    expect(d.sectionId).toBe("map-result");
    expect(biggestDiscovery(SAMPLE_RESULT_NO_ISSUES)).toBeNull();
  });

  it("links only to transcript segments that exist", () => {
    const section = { ...SAMPLE_RESULT.presentationMap!.sections[0], segmentIds: ["seg-01", "missing"] };
    expect(linkableSegmentIds(SAMPLE_RESULT, section)).toEqual(["seg-01"]);
    expect(linkableSegmentIds({ ...SAMPLE_RESULT, transcript: undefined }, section)).toEqual([]);
  });
});
