import { describe, expect, it } from "vitest";
import { SAMPLE_RESULT } from "@/mocks/sample-result";
import { ApiError, safeErrorMessage, shouldRetryQuery } from "./client";
import { AnalysisResultSchema, AnalysisStatusSchema } from "./types";

describe("shared API contract", () => {
  it("accepts status payloads with null error fields", () => {
    const status = AnalysisStatusSchema.parse({ presentationId: "p", stage: "listening", progress: 0.6, error: null, failedStage: null, updatedAt: "2026-09-23T00:00:00.000Z" });
    expect(status.error).toBeNull();
  });

  it("keeps transcript optional so sample payloads stay valid", () => {
    expect(AnalysisResultSchema.parse(SAMPLE_RESULT).transcript).toBeUndefined();
    expect(SAMPLE_RESULT.isSample).toBe(true);
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
