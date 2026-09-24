import { describe, expect, it } from "vitest";
import { SAMPLE_RESULT } from "@/mocks/sample-result";
import { ApiError, safeErrorMessage, shouldRetryQuery } from "./client";
import { AnalysisResultSchema, AnalysisStatusSchema } from "./types";

describe("shared API contract", () => {
  it("accepts status payloads with null error fields", () => {
    const status = AnalysisStatusSchema.parse({ presentationId: "p", stage: "listening", progress: 0.6, error: null, failedStage: null, updatedAt: "2026-09-23T00:00:00.000Z" });
    expect(status.error).toBeNull();
  });

  it("keeps transcript and Phase 4 fields optional so older payloads stay valid", () => {
    const { transcript, presentationMap, audienceHeatmap, discovery, ...legacy } = SAMPLE_RESULT;
    expect([transcript, presentationMap, audienceHeatmap, discovery].every(Boolean)).toBe(true);
    const parsed = AnalysisResultSchema.parse(legacy);
    expect(parsed.transcript).toBeUndefined();
    expect(parsed.presentationMap).toBeUndefined();
    expect(SAMPLE_RESULT.isSample).toBe(true);
  });

  it("drops malformed Phase 4 detail instead of failing the whole payload", () => {
    const status = AnalysisStatusSchema.parse({
      presentationId: "p",
      stage: "listening",
      pipeline: { steps: [{ step: "dreaming", state: "running" }] },
      updatedAt: "2026-09-23T00:00:00.000Z",
    });
    expect(status.pipeline).toBeNull();
    const result = AnalysisResultSchema.parse({ ...SAMPLE_RESULT, audienceHeatmap: { cells: [{ reception: "maybe" }] } });
    expect(result.audienceHeatmap).toBeUndefined();
    expect(result.presentationMap?.sections).toHaveLength(4);
  });

  it("does not retry errors that asking again cannot fix", () => {
    expect(shouldRetryQuery(0, new ApiError("presentation_not_found", ""))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError("result_not_ready", ""))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError("network_error", ""))).toBe(true);
    expect(shouldRetryQuery(2, new ApiError("network_error", ""))).toBe(false);
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(safeErrorMessage("provider_quota")).toBe("요청을 처리하지 못했어요.");
    expect(safeErrorMessage(undefined)).toBe("요청을 처리하지 못했어요.");
  });
});
