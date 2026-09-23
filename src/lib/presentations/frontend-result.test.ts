import { beforeEach, describe, expect, it } from "vitest";
import { MockPresentationAnalysisProvider, runAnalysis, setAnalysisProvider } from "./analysis";
import { toFrontendAnalysisResult } from "./frontend-result";
import { presentationRepository } from "./store";

describe("frontend analysis contract", () => {
  beforeEach(() => {
    presentationRepository.clear();
    setAnalysisProvider(new MockPresentationAnalysisProvider());
  });

  it("normalizes the provider result into the UI schema", async () => {
    const presentation = presentationRepository.create({
      title: "Contract demo",
      durationSeconds: 30,
      transcript: null,
      audio: { filename: "demo.webm", mimeType: "audio/webm", sizeBytes: 10 },
    });

    await runAnalysis(presentation.id);
    const stored = presentationRepository.get(presentation.id);
    expect(stored?.result).not.toBeNull();

    const result = toFrontendAnalysisResult(stored!, stored!.result!);
    expect(result.presentationId).toBe(presentation.id);
    expect(result.personas).toHaveLength(3);
    expect(result.difficultSections[0]?.improvement.suggestion).toBeTruthy();
    expect(result.isSample).toBe(true);
  });
});
