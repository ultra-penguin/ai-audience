import { describe, expect, it, beforeEach } from "vitest";
import { MockPresentationAnalysisProvider, runAnalysis, setAnalysisProvider } from "./analysis";
import { presentationRepository } from "./store";

describe("presentation analysis contract", () => {
  beforeEach(() => {
    presentationRepository.clear();
    setAnalysisProvider(new MockPresentationAnalysisProvider());
  });

  it("returns explicitly labeled sample feedback with three personas", async () => {
    const presentation = presentationRepository.create({
      title: "Demo",
      durationSeconds: 30,
      transcript: null,
      audio: { filename: "demo.webm", mimeType: "audio/webm", sizeBytes: 10 },
    });
    await runAnalysis(presentation.id);
    const result = presentationRepository.get(presentation.id);
    expect(result?.status).toBe("complete");
    expect(result?.result?.mode).toBe("mock");
    expect(result?.result?.disclaimer).toContain("not real AI");
    expect(result?.result?.personas).toHaveLength(3);
    expect(result?.result?.improvements.length).toBeGreaterThan(0);
  });

  it("marks malformed provider output as failed", async () => {
    setAnalysisProvider({ analyze: async () => ({}) as never });
    const presentation = presentationRepository.create({
      title: "Demo",
      durationSeconds: null,
      transcript: "Hello",
      audio: { filename: "demo.webm", mimeType: "audio/webm", sizeBytes: 10 },
    });
    await runAnalysis(presentation.id);
    expect(presentationRepository.get(presentation.id)?.status).toBe("failed");
    expect(presentationRepository.get(presentation.id)?.error?.code).toBe("analysis_failed");
  });
});
