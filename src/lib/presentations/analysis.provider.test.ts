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
