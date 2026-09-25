import { beforeEach, describe, expect, it } from "vitest";
import { MockPresentationAnalysisProvider, ProviderPresentationAnalysisProvider, runAnalysis, setAnalysisProvider } from "./analysis";
import { toFrontendAnalysisResult } from "./frontend-result";
import type { JsonLanguageModelProvider, SpeechToTextProvider } from "./providers";
import { presentationRepository, type AnalysisPipelineSnapshot } from "./store";

const speechToText: SpeechToTextProvider = {
  transcribe: async () => ({
    text: "첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.",
    segments: [
      { startSeconds: 0, endSeconds: 3.2, text: "첫 번째 문장입니다." },
      { startSeconds: 3.2, endSeconds: 7.5, text: "두 번째 문장입니다." },
      { startSeconds: 7.5, endSeconds: 11, text: "세 번째 문장입니다." },
    ],
  }),
};

function sectionRow(sectionId: string, understanding: "followed" | "partly_lost" | "lost", evidence: string) {
  const stuck = understanding !== "followed";
  return {
    sectionId,
    stateBefore: "발표 주제를 막 들은 상태예요.",
    newInformation: stuck ? "핵심 개념이라는 새 용어" : "발표 주제 소개",
    stateAfter: stuck ? "핵심 개념이 앞 내용과 어떻게 이어지는지 연결하지 못했어요." : "흐름을 따라가고 있어요.",
    reaction: stuck ? "UNDERSTANDING_DROP" : "NO_SIGNIFICANT_CHANGE",
    understanding,
    agreement: "neutral",
    cause: stuck ? "TERM_CONFUSION" : null,
    evidence,
    naturalReaction: stuck ? "이 구간에서 설명이 더 필요할 가능성이 있어요." : "이 구간은 잘 따라왔을 가능성이 높아요.",
    likelihood: "likely",
    salience: { understanding: stuck, attention: stuck, keyMessage: stuck, natural: stuck, improvable: stuck },
    question: null,
    mentalModelGap: null,
    recovery: null,
    improvement: stuck ? { title: "개념 정의하기", action: "쉬운 말로 정의하세요.", example: "일상 사례를 덧붙이세요." } : null,
  };
}

const languageModel: JsonLanguageModelProvider = {
  completeJson: async ({ system }) => {
    if (system.includes("발표 구조 분석기")) {
      return JSON.stringify({
        sections: [
          { id: "intro", title: "도입", startSegmentIndex: 0, endSegmentIndex: 0, summary: "발표 주제를 소개합니다." },
          { id: "concept", title: "핵심 개념", startSegmentIndex: 1, endSegmentIndex: 2, summary: "핵심 개념을 설명합니다." },
        ],
      });
    }
    if (system.includes("발표 분석 통합기")) return "not json";
    // Only the beginner loses the concept section; peer and specialist follow it.
    const lost = system.includes("비전공 관중");
    return JSON.stringify({
      overallExperience: "전체 흐름은 들었을 가능성이 높아요.",
      sections: [
        sectionRow("intro", "followed", "첫 번째 문장입니다."),
        lost ? sectionRow("concept", "lost", "두 번째 문장입니다.") : sectionRow("concept", "followed", "세 번째 문장입니다."),
      ],
    });
  },
};

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

  it("exposes presentation map, heatmap evidence and STT timestamps from the structured provider pipeline", async () => {
    setAnalysisProvider(new ProviderPresentationAnalysisProvider(speechToText, languageModel));
    const presentation = presentationRepository.create({
      title: "구조 분석",
      durationSeconds: 11,
      transcript: null,
      audio: { filename: "talk.webm", mimeType: "audio/webm", sizeBytes: 4 },
      audioBytes: new Uint8Array([1]),
    });
    const pipelines: AnalysisPipelineSnapshot[] = [];
    const update = presentationRepository.update.bind(presentationRepository);
    presentationRepository.update = (id, patch) => {
      if (patch.pipeline) pipelines.push(patch.pipeline);
      return update(id, patch);
    };
    try {
      await runAnalysis(presentation.id);
    } finally {
      presentationRepository.update = update;
    }
    const stored = presentationRepository.get(presentation.id)!;
    expect(stored.status).toBe("complete");
    expect(pipelines.length).toBeGreaterThan(0);
    expect(pipelines.every((pipeline) => pipeline.message && /[가-힣]/.test(pipeline.message))).toBe(true);

    const result = toFrontendAnalysisResult(stored, stored.result!);
    expect(result.isSample).toBe(false);
    expect(result.transcript?.segments.map((segment) => [segment.startSec, segment.endSec])).toEqual([[0, 3.2], [3.2, 7.5], [7.5, 11]]);
    expect(result.presentationMap?.sections).toEqual([
      expect.objectContaining({ id: "intro", startSec: 0, endSec: 3.2, segmentIds: ["segment-1"], difficultSectionIds: [] }),
      expect.objectContaining({ id: "concept", startSec: 3.2, endSec: 11, segmentIds: ["segment-2", "segment-3"], difficultSectionIds: ["segment-2"] }),
    ]);
    expect(result.audienceHeatmap?.cells).toHaveLength(6);
    expect(result.audienceHeatmap?.cells).toContainEqual({ sectionId: "concept", personaId: "p-beginner", reception: "lost", evidence: "두 번째 문장입니다." });
    expect(result.keyMoments).toEqual([expect.objectContaining({ kind: "first_drop", sectionId: "concept", difficultSectionId: "segment-2", personaIds: ["p-beginner"] })]);
    expect(result.missingExplanations).toEqual([expect.objectContaining({ term: "핵심 개념이라는 새 용어", suggestedExplanation: "쉬운 말로 정의하세요.", personaIds: ["p-beginner"] })]);
    expect(result.exampleSuggestions).toEqual([]);
    expect(result.audienceHeatmap?.cells).toContainEqual({ sectionId: "concept", personaId: "p-peer", reception: "clear", evidence: "세 번째 문장입니다." });

    const [difficult] = result.difficultSections;
    expect(result.difficultSections).toHaveLength(1);
    expect(difficult).toMatchObject({
      id: "segment-2",
      startSec: 3.2,
      endSec: 11,
      transcript: "두 번째 문장입니다. 세 번째 문장입니다.",
      highlight: "두 번째 문장입니다.",
      severity: "high",
      reactions: [{ personaId: "p-beginner", reaction: "이 구간에서 설명이 더 필요할 가능성이 있어요." }],
      cause: "TERM_CONFUSION",
      category: "terminology",
      // Three short sentences are thin evidence, so "likely" is calibrated down.
      likelihood: "possible",
    });
    expect(difficult?.pattern).toContain("일반 관중");
    expect(Object.fromEntries(result.personaFeedback.map((feedback) => [feedback.personaId, feedback.difficultSectionIds]))).toEqual({
      "p-beginner": ["segment-2"],
      "p-peer": [],
      "p-specialist": [],
    });
    expect(result.discovery?.sectionId).toBe("concept");
    expect(result.discovery?.difficultSectionId).toBe("segment-2");
  });
});
