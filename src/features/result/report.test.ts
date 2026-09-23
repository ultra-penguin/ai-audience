import { describe, expect, it } from "vitest";
import { SAMPLE_RESULT } from "@/mocks/sample-result";
import {
  distinctKeyMessage,
  resolveSelected,
  sectionsByFixOrder,
  sectionsByTime,
  sectionsHeardBy,
  stumbleText,
} from "./report";

const sections = SAMPLE_RESULT.difficultSections;

describe("result report helpers", () => {
  it("orders sections by time for reading and by priority/severity for fixing", () => {
    const shuffled = [...sections].reverse();
    expect(sectionsByTime(shuffled).map((s) => s.id)).toEqual(["sec-metric", "sec-features", "sec-model", "sec-conclusion"]);
    expect(sectionsByFixOrder(shuffled, "sec-conclusion").map((s) => s.id)).toEqual([
      "sec-conclusion",
      "sec-metric",
      "sec-features",
      "sec-model",
    ]);
    expect(sectionsByFixOrder(shuffled).map((s) => s.id)[0]).toBe("sec-metric");
  });

  it("finds the sections a persona reacted to", () => {
    expect(sectionsHeardBy(sections, "p-peer").map((s) => s.id)).toEqual(["sec-metric", "sec-features", "sec-conclusion"]);
    expect(sectionsHeardBy(sections, "nobody")).toEqual([]);
  });

  it("uses the highlight only when it really is part of the transcript", () => {
    expect(stumbleText(sections[0])).toBe("MAPE 기준으로 12.4% 개선된");
    expect(stumbleText({ ...sections[0], highlight: "없는 문장" })).toBe(sections[0].transcript);
    expect(stumbleText({ ...sections[0], highlight: undefined })).toBe(sections[0].transcript);
  });

  it("hides a key message that only repeats the headline", () => {
    expect(distinctKeyMessage(SAMPLE_RESULT.summary)).toBe(SAMPLE_RESULT.summary.intendedKeyMessage);
    expect(distinctKeyMessage({ ...SAMPLE_RESULT.summary, intendedKeyMessage: SAMPLE_RESULT.summary.headline })).toBeNull();
  });

  it("falls back from a hidden selection to the priority section, then the first", () => {
    expect(resolveSelected(sections, "sec-model", "sec-metric")?.id).toBe("sec-model");
    expect(resolveSelected(sections, "gone", "sec-conclusion")?.id).toBe("sec-conclusion");
    expect(resolveSelected(sections.slice(1, 3), null, "sec-metric")?.id).toBe("sec-features");
    expect(resolveSelected([], null)).toBeUndefined();
  });
});
