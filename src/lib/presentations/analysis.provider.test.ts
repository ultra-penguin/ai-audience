import { beforeEach, describe, expect, it } from "vitest";
import {
  createAnalysisProviderFromEnv,
  MockPresentationAnalysisProvider,
  ProviderPresentationAnalysisProvider,
  runAnalysis,
  setAnalysisProvider,
} from "./analysis";
import { ProviderError, type JsonLanguageModelProvider, type SpeechToTextProvider } from "./providers";
import { presentationRepository } from "./store";

const personaResponse = JSON.stringify({
  comprehensionScore: 70,
  attentionScore: 80,
  reaction: "발표의 핵심 흐름은 이해했지만 한 가지 예시가 더 필요합니다.",
  blockers: ["핵심 개념의 예시가 부족합니다."],
  questions: ["실제 적용 사례가 있나요?"],
  focusSegmentIndexes: [0],
  missingExplanations: ["핵심 개념을 쉬운 말로 설명해 주세요."],
  improvements: [],
});

const speechToText: SpeechToTextProvider = {
  transcribe: async () => ({ text: "첫 번째 문장입니다. 두 번째 문장입니다.", segments: [{ startSeconds: 0, endSeconds: 2, text: "첫 번째 문장입니다." }] }),
};

describe("real analysis provider", () => {
  beforeEach(() => {
    presentationRepository.clear();
    setAnalysisProvider(new MockPresentationAnalysisProvider());
  });

  it("selects mock without both server-side keys and provider with both keys", () => {
    expect(createAnalysisProviderFromEnv({})).toBeInstanceOf(MockPresentationAnalysisProvider);
    expect(createAnalysisProviderFromEnv({ STT_API_KEY: "stt-secret", LLM_API_KEY: "llm-secret" })).toBeInstanceOf(ProviderPresentationAnalysisProvider);
    expect(createAnalysisProviderFromEnv({ GROQ_API_KEY: "groq-secret", STT_PROVIDER: "groq", LLM_PROVIDER: "groq" })).toBeInstanceOf(ProviderPresentationAnalysisProvider);
  });

  it("runs exactly three persona calls concurrently and validates their JSON", async () => {
    let active = 0;
    let maxActive = 0;
    const languageModel: JsonLanguageModelProvider = {
      completeJson: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return personaResponse;
      },
    };
    const provider = new ProviderPresentationAnalysisProvider(speechToText, languageModel);
    const result = await provider.analyze({
      presentation: {
        id: "id",
        title: "title",
        durationSeconds: 2,
        transcript: null,
        audio: { filename: "talk.webm", mimeType: "audio/webm", sizeBytes: 4 },
        audioBytes: new Uint8Array([1, 2, 3, 4]),
      },
    });
    expect(maxActive).toBe(3);
    expect(result.personas.map((persona) => persona.name)).toEqual(["비전공 관중", "일반 관중", "전문가 관중"]);
    expect(result.transcript.text).toContain("첫 번째");
  });

  it("runs the structured Korean pipeline and reports its live context", async () => {
    const stages: string[] = [];
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
        if (system.includes("발표 분석 통합기")) {
          return JSON.stringify({
            headline: "핵심 개념의 설명이 비전공 관중에게 부족했어요.",
            intendedKeyMessage: "핵심 개념을 쉽게 설명해야 합니다.",
            strengths: ["도입의 주제가 명확합니다."],
            discovery: {
              kind: "common",
              title: "여러 관중이 같은 구간에서 멈췄어요",
              detail: "핵심 개념에서 추가 설명이 필요합니다.",
              sectionId: "concept",
              personaIds: ["beginner", "peer"],
              evidence: "핵심 개념을 설명합니다.",
            },
          });
        }
        return JSON.stringify({
          overallReaction: "도입은 이해했지만 핵심 개념은 설명이 더 필요합니다.",
          sections: [
            {
              sectionId: "intro",
              understanding: "followed",
              comprehensionScore: 80,
              attentionScore: 78,
              reaction: "도입의 주제는 이해했습니다.",
              evidence: "첫 번째 문장입니다.",
              reason: "주제가 직접적으로 소개되었습니다.",
              blockers: [],
              questions: [],
              needsExample: false,
              improvement: null,
            },
            {
              sectionId: "concept",
              understanding: "partly_lost",
              comprehensionScore: 58,
              attentionScore: 60,
              reaction: "핵심 개념을 한 번 더 풀어 설명해 주세요.",
              evidence: "두 번째 문장입니다.",
              reason: "개념의 정의가 짧습니다.",
              blockers: ["핵심 개념의 정의가 부족합니다."],
              questions: ["실제 예시는 무엇인가요?"],
              needsExample: true,
              improvement: { title: "개념을 먼저 정의하기", problem: "정의가 짧습니다.", action: "쉬운 말로 정의하세요.", example: "일상적인 사례를 덧붙이세요." },
            },
          ],
        });
      },
    };
    const provider = new ProviderPresentationAnalysisProvider(speechToText, languageModel);
    const result = await provider.analyze({
      presentation: {
        id: "id",
        title: "title",
        durationSeconds: 2,
        transcript: "첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.",
        audio: { filename: "talk.webm", mimeType: "audio/webm", sizeBytes: 4 },
        audioBytes: new Uint8Array([1]),
      },
      onStage: (stage, context) => stages.push(`${stage}:${context?.phase}:${context?.pipeline?.steps.find((step) => step.state === "running")?.step ?? "none"}`),
    });

    expect(result.structure?.sections.map((section) => section.id)).toEqual(["intro", "concept"]);
    expect(result.sectionAnalyses).toHaveLength(6);
    expect(result.discovery?.sectionId).toBe("concept");
    expect(stages).toContain("evaluating:persona:persona");
    expect(stages).toContain("cross_check:cross_check:cross_check");
  });

  it("retries malformed JSON once per persona", async () => {
    const calls = new Map<string, number>();
    const languageModel: JsonLanguageModelProvider = {
      completeJson: async (input) => {
        const persona = input.system.match(/당신은 (.+?)입니다\./)?.[1] ?? "unknown";
        const count = (calls.get(persona) ?? 0) + 1;
        calls.set(persona, count);
        return count === 1 ? "not json" : personaResponse;
      },
    };
    const provider = new ProviderPresentationAnalysisProvider(speechToText, languageModel);
    const result = await provider.analyze({
      presentation: {
        id: "id",
        title: "title",
        durationSeconds: 2,
        transcript: "발표 원문입니다.",
        audio: { filename: "talk.webm", mimeType: "audio/webm", sizeBytes: 4 },
        audioBytes: new Uint8Array([1]),
      },
    });
    expect([...calls.values()]).toEqual([2, 2, 2, 2]);
    expect(result.personas).toHaveLength(3);
  });

  it("fails safely after the one malformed-output retry", async () => {
    const provider = new ProviderPresentationAnalysisProvider(speechToText, { completeJson: async () => "{}" });
    const presentation = presentationRepository.create({
      title: "Empty output",
      durationSeconds: 2,
      transcript: "발표 원문입니다.",
      audio: { filename: "talk.webm", mimeType: "audio/webm", sizeBytes: 4 },
      audioBytes: new Uint8Array([1]),
    });
    await runAnalysis(presentation.id, provider);
    expect(presentationRepository.get(presentation.id)?.status).toBe("failed");
    expect(presentationRepository.get(presentation.id)?.error).toEqual({ code: "analysis_failed", message: "The analysis provider returned invalid analysis data." });
  });

  it("returns a safe provider error for missing audio and transcript", async () => {
    const provider = new ProviderPresentationAnalysisProvider(speechToText, { completeJson: async () => personaResponse });
    await expect(provider.analyze({
      presentation: {
        id: "id",
        title: "title",
        durationSeconds: null,
        transcript: null,
        audio: { filename: "talk.webm", mimeType: "audio/webm", sizeBytes: 1 },
        audioBytes: undefined,
      },
    })).rejects.toMatchObject({ code: "analysis_empty_transcript" });
    expect(new ProviderError("analysis_timeout", "The language-model provider timed out.").message).not.toContain("secret");
  });
});

describe("audio retention", () => {
  it("retains uploaded bytes server-side without changing response metadata", () => {
    presentationRepository.clear();
    const presentation = presentationRepository.create({
      title: "Talk",
      durationSeconds: 4,
      transcript: null,
      audio: { filename: "talk.webm", mimeType: "audio/webm", sizeBytes: 3 },
      audioBytes: new Uint8Array([4, 5, 6]),
    });
    expect([...presentation.audioBytes!]).toEqual([4, 5, 6]);
  });
});
