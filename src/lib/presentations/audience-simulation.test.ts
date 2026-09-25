import { describe, expect, it } from "vitest";
import {
  calibrateLikelihood,
  isIssue,
  keyMoments,
  naturalQuestions,
  patternFallback,
  salienceLevel,
  selectIssues,
  simulatedSectionSchema,
  type PersonaId,
  type PersonaSimulation,
  type SimulatedSection,
} from "./audience-simulation";
import { ProviderPresentationAnalysisProvider } from "./analysis";
import type { JsonLanguageModelProvider, SpeechToTextProvider } from "./providers";
import type { StructureSection } from "./schemas";

const NAMES: Record<PersonaId, string> = { beginner: "비전공 관중", peer: "일반 관중", specialist: "전문가 관중" };
const NONE = { understanding: false, attention: false, keyMessage: false, natural: false, improvable: false };
const ALL = { understanding: true, attention: true, keyMessage: true, natural: true, improvable: true };

function section(sectionId: string, overrides: Partial<SimulatedSection> = {}): SimulatedSection {
  return simulatedSectionSchema.parse({
    sectionId,
    stateBefore: "앞 내용을 따라온 상태예요.",
    newInformation: "새 설명",
    stateAfter: "흐름을 따라가고 있어요.",
    reaction: "NO_SIGNIFICANT_CHANGE",
    understanding: "followed",
    agreement: "neutral",
    cause: null,
    evidence: "근거 문장",
    naturalReaction: "큰 변화 없이 들었을 가능성이 높아요.",
    likelihood: "likely",
    salience: NONE,
    question: null,
    mentalModelGap: null,
    recovery: null,
    improvement: null,
    ...overrides,
  });
}

function structure(count: number): StructureSection[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `s${index + 1}`,
    title: `구간 ${index + 1}`,
    startSeconds: index * 10,
    endSeconds: (index + 1) * 10,
    summary: "요약",
    segmentIds: [`segment-${index + 1}`],
  }));
}

const stuck = (sectionId: string, salience = ALL, overrides: Partial<SimulatedSection> = {}) =>
  section(sectionId, { reaction: "UNDERSTANDING_DROP", understanding: "lost", cause: "TERM_CONFUSION", salience, ...overrides });

describe("salience filter", () => {
  it("maps met criteria to IGNORE / LOW / SIGNIFICANT / CRITICAL", () => {
    const withCount = (n: number) => ({ reaction: "CONFUSION" as const, salience: { understanding: n > 0, attention: n > 1, keyMessage: n > 2, natural: n > 3, improvable: n > 4 } });
    expect([0, 1, 2, 3, 4, 5].map((n) => salienceLevel(withCount(n)))).toEqual(["IGNORE", "IGNORE", "LOW", "LOW", "SIGNIFICANT", "CRITICAL"]);
  });

  it("never turns NO_SIGNIFICANT_CHANGE into feedback, even if the model flagged criteria", () => {
    expect(isIssue(section("s1", { salience: ALL }))).toBe(false);
  });

  it("drops nitpicks that only a critic would notice (≤1 criterion)", () => {
    const nitpick = stuck("s1", { ...NONE, improvable: true }, { reaction: "INTEREST_DROP", understanding: "followed", cause: null });
    expect(isIssue(nitpick)).toBe(false);
    expect(selectIssues(structure(1), [{ personaId: "specialist", section: nitpick }], 10)).toEqual([]);
  });
});

describe("feedback priority", () => {
  it("keeps at most five significant issues, highest impact first", () => {
    const sections = structure(8);
    const sims: PersonaSimulation[] = sections.map((s, index) => ({
      personaId: "beginner",
      section: stuck(s.id, index === 6 ? ALL : { ...ALL, keyMessage: false }),
    }));
    const issues = selectIssues(sections, sims, 80);
    expect(issues).toHaveLength(5);
    // The one issue that also hurts the key message outranks the rest.
    expect(issues[0]?.section.id).toBe("s7");
    expect(issues[0]?.level).toBe("CRITICAL");
  });

  it("only uses low-priority issues to fill up to three, never to pad a talk with major issues", () => {
    const sections = structure(6);
    const low = { understanding: true, attention: false, keyMessage: false, natural: true, improvable: false };
    const sims: PersonaSimulation[] = [
      { personaId: "peer", section: stuck("s1") },
      ...["s2", "s3", "s4", "s5"].map((id) => ({ personaId: "peer" as const, section: stuck(id, low) })),
    ];
    const issues = selectIssues(sections, sims, 60);
    expect(issues.map((issue) => issue.level)).toEqual(["CRITICAL", "LOW", "LOW"]);
  });

  it("ranks an issue several listeners share above the same issue for one listener", () => {
    const sections = structure(2);
    const sims: PersonaSimulation[] = [
      { personaId: "beginner", section: stuck("s1") },
      { personaId: "beginner", section: stuck("s2") },
      { personaId: "peer", section: stuck("s2") },
    ];
    expect(selectIssues(sections, sims, 20)[0]?.section.id).toBe("s2");
  });
});

describe("cross-persona pattern", () => {
  it("explains who stopped and who compensated instead of counting heads", () => {
    const sections = structure(1);
    const sims: PersonaSimulation[] = [
      { personaId: "beginner", section: stuck("s1", ALL, { cause: "PURPOSE_CONFUSION" }) },
      { personaId: "peer", section: section("s1") },
      { personaId: "specialist", section: section("s1") },
    ];
    const [issue] = selectIssues(sections, sims, 10);
    const text = patternFallback(issue!, NAMES);
    expect(text).toContain("비전공 관중");
    expect(text).toContain("일반 관중, 전문가 관중");
    expect(text).toContain("왜 필요한지 모름");
    expect(text).not.toMatch(/\d명 중/);
  });
});

describe("key moments and natural questions", () => {
  it("reports the first drop, the interest peak and a shared question in speaking order", () => {
    const sections = structure(3);
    const sims: PersonaSimulation[] = [
      { personaId: "beginner", section: section("s1", { reaction: "INTEREST_INCREASE", salience: { ...NONE, natural: true } }) },
      { personaId: "beginner", section: stuck("s2") },
      { personaId: "beginner", section: section("s3", { reaction: "QUESTION", question: "실제로는 어디에 쓰나요?", salience: { ...NONE, natural: true, understanding: true } }) },
      { personaId: "peer", section: section("s3", { reaction: "QUESTION", question: "실제로는 어디에 쓰나요?", salience: { ...NONE, natural: true } }) },
      // A question only asked to look smart (not natural) is dropped.
      { personaId: "specialist", section: section("s1", { reaction: "QUESTION", question: "표본 크기는요?", salience: NONE }) },
    ];
    expect(keyMoments(sections, sims, NAMES).map((moment) => [moment.kind, moment.sectionId])).toEqual([
      ["interest_peak", "s1"],
      ["first_drop", "s2"],
      ["common_question", "s3"],
    ]);
    expect(naturalQuestions(sections, sims)).toEqual([{ question: "실제로는 어디에 쓰나요?", sectionId: "s3", personaIds: ["beginner", "peer"] }]);
  });
});

describe("uncertainty calibration", () => {
  it("lowers confidence one step when the transcript is too thin", () => {
    expect(calibrateLikelihood("high", true)).toBe("likely");
    expect(calibrateLikelihood("likely", true)).toBe("possible");
    expect(calibrateLikelihood("high", false)).toBe("high");
  });

  it("tolerates unknown enum values from the model instead of failing the analysis", () => {
    const parsed = simulatedSectionSchema.parse({ ...section("s1"), reaction: "BORED", likelihood: "maybe", cause: "HARD" });
    expect([parsed.reaction, parsed.likelihood, parsed.cause]).toEqual(["NO_SIGNIFICANT_CHANGE", "uncertain", null]);
  });
});

describe("layered simulation prompts", () => {
  it("simulates each persona independently with a cognitive model, not critic instructions", async () => {
    const calls: { system: string; user: string }[] = [];
    const speechToText: SpeechToTextProvider = { transcribe: async () => ({ text: "", segments: [] }) };
    const languageModel: JsonLanguageModelProvider = {
      completeJson: async (input) => {
        calls.push(input);
        if (input.system.includes("발표 구조 분석기")) {
          return JSON.stringify({ sections: [{ id: "intro", title: "도입", startSegmentIndex: 0, endSegmentIndex: 1, summary: "주제를 소개합니다." }] });
        }
        if (input.system.includes("발표 분석 통합기")) return "not json";
        return JSON.stringify({ overallExperience: "흐름을 따라왔을 가능성이 높아요.", sections: [section("intro")] });
      },
    };
    const result = await new ProviderPresentationAnalysisProvider(speechToText, languageModel).analyze({
      presentation: {
        id: "id",
        title: "title",
        durationSeconds: 24,
        transcript: "오늘은 새 서비스를 소개합니다. 이 서비스는 문서를 찾아 답합니다.",
        audio: { filename: "talk.webm", mimeType: "audio/webm", sizeBytes: 4 },
        audioBytes: new Uint8Array([1]),
      },
    });

    const personaCalls = calls.filter((call) => call.system.includes("관중 시뮬레이션 엔진"));
    expect(personaCalls).toHaveLength(3);
    for (const call of personaCalls) {
      expect(call.system).toContain("발표 평가자가 아닙니다");
      expect(call.system).toContain("[인지 상태 규칙]");
      expect(call.system).toContain("[중요도 규칙]");
      expect(call.system).toContain("전문 용어 허용도");
      expect(call.system).not.toContain("충분한지 살핍니다");
      // Independence: the listener hears only the talk, never another persona's reaction.
      expect(call.user).toContain("[발표 맥락]");
      expect(call.user).not.toContain("흐름을 따라왔을 가능성이 높아요.");
    }
    expect(personaCalls[0]!.system).toContain("전문 용어 허용도 low");
    expect(personaCalls[2]!.system).toContain("전문 용어 허용도 high");

    // A talk with no salient change yields no invented problems.
    expect(result.difficultSections).toEqual([]);
    expect(result.improvements).toEqual([]);
    expect(result.discovery?.title).toBe("핵심 흐름은 대체로 전달됐어요");
  });
});
