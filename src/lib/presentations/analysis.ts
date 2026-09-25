import { z } from "zod";
import { ApiError } from "./errors";
import { presentationRepository, type AnalysisPipelineSnapshot, type StoredPresentation } from "./store";
import {
  analysisDiscoverySchema,
  analysisResultSchema,
  sectionAudienceAnalysisSchema,
  type AnalysisDiscovery,
  type AnalysisResult,
  type StructureSection,
  type TranscriptSegment,
} from "./schemas";
import {
  calibrateLikelihood,
  CONFUSION_LABEL,
  formatTimestamp,
  internalScores,
  isIssue,
  keyMoments,
  naturalQuestions,
  patternFallback,
  PERSONA_MODELS,
  personaPrompt,
  presentationContext,
  salienceLevel,
  selectIssues,
  SIMULATION_SYSTEM_RULES,
  simulationKoreanStrings,
  simulationResponseSchema,
  type AudienceIssue,
  type ConfusionType,
  type PersonaId,
  type PersonaSimulation,
  type SimulationResponse,
} from "./audience-simulation";
import {
  createConfiguredProviders,
  ProviderError,
  type JsonLanguageModelProvider,
  type SpeechToTextProvider,
  type SpeechToTextResult,
  type ProviderEnv,
} from "./providers";

export interface PresentationAnalysisProvider {
  analyze(input: {
    presentation: Pick<StoredPresentation, "id" | "title" | "durationSeconds" | "transcript" | "audio" | "audioBytes">;
    onStage?: (stage: ProgressStage, context?: ProgressContext) => void;
  }): Promise<AnalysisResult>;
}

type ProgressStage = "transcribing" | "structuring" | "segmenting" | "evaluating" | "cross_check" | "finalizing";
type ProgressContext = {
  phase: "structure" | "section" | "persona" | "cross_check" | "synthesis";
  sectionId?: string;
  personaId?: "beginner" | "peer" | "specialist";
  message: string;
  pipeline?: AnalysisPipelineSnapshot;
};

/** Display identity only; how each listener thinks lives in PERSONA_MODELS. */
type FixedPersona = {
  id: "beginner" | "peer" | "specialist";
  name: "비전공 관중" | "일반 관중" | "전문가 관중";
  perspective: string;
};

export const FIXED_PERSONAS: readonly FixedPersona[] = [
  { id: "beginner", name: "비전공 관중", perspective: "관련 배경지식이 많지 않아 발표자의 설명만으로 이해하려는 관중" },
  { id: "peer", name: "일반 관중", perspective: "주제에 어느 정도 관심과 일반적인 업무 경험이 있는 관중" },
  { id: "specialist", name: "전문가 관중", perspective: "주제의 세부 내용과 근거, 한계를 검토할 수 있는 전문가 관중" },
] as const;

function pipelineSnapshot(
  sections: StructureSection[] = [],
  currentSectionId: string | null = null,
  currentPersonaId: string | null = null,
  activeStep: "structure" | "section" | "persona" | "cross_check" | null = "structure",
  cells: AnalysisPipelineSnapshot["cells"] = [],
  insights: AnalysisPipelineSnapshot["insights"] = [],
): AnalysisPipelineSnapshot {
  const order: AnalysisPipelineSnapshot["steps"][number]["step"][] = ["structure", "section", "persona", "cross_check"];
  const activeIndex = activeStep === null ? order.length : order.indexOf(activeStep);
  return {
    steps: order.map((step, index) => ({ step, state: index < activeIndex ? "done" : index === activeIndex ? "running" : "pending" })),
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      startSec: section.startSeconds,
      endSec: section.endSeconds,
      summary: section.summary,
      segmentIds: section.segmentIds,
    })),
    personas: FIXED_PERSONAS.map((persona) => ({ id: `p-${persona.id}`, kind: persona.id === "specialist" ? "expert" : persona.id, name: persona.name })),
    currentSectionId,
    currentPersonaId: currentPersonaId ? `p-${currentPersonaId}` : null,
    cells,
    message: null,
    insights,
  };
}

function personaCells(
  sections: StructureSection[],
  completedPersonaIds: string[],
  activePersonaId: string | null,
): AnalysisPipelineSnapshot["cells"] {
  return FIXED_PERSONAS.flatMap((persona) =>
    sections.map((section) => ({
      sectionId: section.id,
      personaId: `p-${persona.id}`,
      state: completedPersonaIds.includes(persona.id) ? "done" : persona.id === activePersonaId ? "running" : "pending",
    })),
  );
}

const SAMPLE_TRANSCRIPT =
  "오늘은 발표 녹음을 관중 중심의 피드백으로 바꾸는 과정을 설명하겠습니다. 먼저 핵심 메시지를 찾습니다. 다음으로 발표 원문을 비전공자, 일반 관중, 전문가 관중의 관점과 비교합니다. 마지막으로 실제 발표 전에 고칠 한 가지를 구체적으로 제안합니다.";

export function sentenceSegments(text: string): TranscriptSegment[] {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
  const parts = sentences.length > 0 ? sentences : [text.trim()];
  const secondsPerSegment = 12;
  return parts.map((sentence, index) => ({
    id: `segment-${index + 1}`,
    startSeconds: index * secondsPerSegment,
    endSeconds: (index + 1) * secondsPerSegment,
    text: sentence,
    difficulty: index === 1 ? ("high" as const) : index === 2 ? ("medium" as const) : ("low" as const),
    issue: index === 1 ? "핵심 메시지는 언급했지만 실제로 어떤 변화가 생기는지는 아직 설명하지 않았습니다." : null,
  }));
}

/** Provider transcripts have no model-derived difficulty until the LLM marks a focus. */
function neutralSegments(text: string): TranscriptSegment[] {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
  const parts = sentences.length > 0 ? sentences : [text.trim()];
  return parts.map((sentence, index) => ({
    id: `segment-${index + 1}`,
    startSeconds: index * 12,
    endSeconds: (index + 1) * 12,
    text: sentence,
    difficulty: "low" as const,
    issue: null,
  }));
}

export class MockPresentationAnalysisProvider implements PresentationAnalysisProvider {
  async analyze({ presentation, onStage }: { presentation: Pick<StoredPresentation, "id" | "title" | "durationSeconds" | "transcript" | "audio" | "audioBytes">; onStage?: (stage: ProgressStage, context?: ProgressContext) => void }): Promise<AnalysisResult> {
    onStage?.("structuring", { phase: "structure", message: "발표의 흐름을 살펴보고 있어요.", pipeline: pipelineSnapshot([], null, null, "structure") });
    const text = presentation.transcript?.trim() || SAMPLE_TRANSCRIPT;
    const segments = sentenceSegments(text);
    const mockStructure = fallbackStructure(segments);
    onStage?.("segmenting", { phase: "section", sectionId: mockStructure[0]?.id, message: "발표를 핵심 구간으로 나누고 있어요.", pipeline: pipelineSnapshot(mockStructure, mockStructure[0]?.id ?? null, null, "section") });
    onStage?.("evaluating", { phase: "persona", message: "세 관중의 관점에서 발표를 비교하고 있어요.", pipeline: pipelineSnapshot(mockStructure, null, "beginner", "persona", personaCells(mockStructure, [], "beginner")) });
    const result = analysisResultSchema.parse({
      version: "1.0", mode: "mock", disclaimer: "Sample/mock analysis for development only; this is not real AI feedback.", generatedAt: new Date().toISOString(),
      summary: { overview: "핵심 흐름은 전달됐지만 중요한 개념에 실제 예시를 덧붙이면 더 잘 이해될 수 있어요.", comprehensionScore: 72, attentionScore: 78, keyMessageScore: 68, intendedKeyMessage: "발표를 여러 관중의 관점에서 점검하고 가장 중요한 개선점을 찾습니다.", strengths: ["분석 흐름이 단계적으로 이어져요."] },
      transcript: { text, segments },
      personas: [
        { id: "beginner", name: "비전공 관중", perspective: FIXED_PERSONAS[0].perspective, comprehensionScore: 64, attentionScore: 75, reaction: "목적은 이해했지만 단계가 어떻게 이어지는지 쉬운 예시가 하나 더 필요해요.", blockers: ["관중 중심 피드백이라는 말의 뜻이 바로 설명되지 않았어요."], questions: ["실제 발표에서는 무엇이 달라지나요?"] },
        { id: "peer", name: "일반 관중", perspective: FIXED_PERSONAS[1].perspective, comprehensionScore: 78, attentionScore: 82, reaction: "흐름은 따라가기 쉬웠지만 실제 발표 사례가 있으면 제안이 더 설득력 있을 것 같아요.", blockers: ["분석에서 개선으로 넘어가는 연결이 조금 갑작스러워요."], questions: ["어떤 문제부터 고칠지는 어떻게 정하나요?"] },
        { id: "specialist", name: "전문가 관중", perspective: FIXED_PERSONAS[2].perspective, comprehensionScore: 73, attentionScore: 77, reaction: "평가 관점은 구분되지만 관중 시뮬레이션을 어디까지 믿어야 하는지 기준이 더 필요해요.", blockers: ["가상 관중 평가의 한계가 설명되지 않았어요."], questions: ["관중별 의견이 다르면 어떻게 해석하나요?"] },
      ],
      difficultSections: [{ segmentId: segments[Math.min(1, segments.length - 1)]!.id, reason: "개념을 실제 예시로 연결하기 전에 용어가 먼저 등장했어요." }],
      missingExplanations: ["관중 중심 피드백을 쉬운 말로 정의하기", "수정 전후 사례 하나 보여주기"],
      improvements: [
        { id: "improvement-1", title: "핵심 메시지에 예시 덧붙이기", problem: "관중이 분석 흐름은 따라가도 결과를 구체적으로 떠올리기 어려워요.", action: "관중 중심 피드백을 소개한 직후 짧은 사례를 추가하세요.", example: "예를 들어 비전공 관중이 낯선 용어에서 막혔다면, 요청이 시작되기 전 기다리는 시간처럼 쉬운 말로 바꿔 설명하세요.", sourceSegmentIds: [segments[Math.min(1, segments.length - 1)]!.id] },
        { id: "improvement-2", title: "피드백 우선순위 설명하기", problem: "마지막 제안에서 어떤 문제를 먼저 고칠지 알려주지 않아요.", action: "문체보다 여러 관중이 공통으로 막힌 개념을 먼저 고친다고 설명하세요.", example: "비전공자와 일반 관중이 모두 어렵다고 느낀 개념부터 고쳐 보세요.", sourceSegmentIds: [segments[Math.min(2, segments.length - 1)]!.id] },
      ],
    });
    onStage?.("cross_check", { phase: "cross_check", message: "관중들의 반응이 갈린 지점을 확인하고 있어요.", pipeline: pipelineSnapshot(mockStructure, null, null, "cross_check", personaCells(mockStructure, FIXED_PERSONAS.map((persona) => persona.id), null)) });
    onStage?.("finalizing", { phase: "synthesis", message: "발표자가 고칠 수 있는 인사이트를 정리하고 있어요.", pipeline: pipelineSnapshot(mockStructure, null, null, null, personaCells(mockStructure, FIXED_PERSONAS.map((persona) => persona.id), null)) });
    return result;
  }
}

const llmPersonaResponseSchema = z.object({
  comprehensionScore: z.number().int().min(0).max(100), attentionScore: z.number().int().min(0).max(100), reaction: z.string().min(1),
  blockers: z.array(z.string().min(1)).max(8), questions: z.array(z.string().min(1)).max(8), focusSegmentIndexes: z.array(z.number().int().min(0).max(100)).max(8).default([]), missingExplanations: z.array(z.string().min(1)).max(8).default([]),
  improvements: z.array(z.object({ title: z.string().min(1), problem: z.string().min(1), action: z.string().min(1), example: z.string().min(1), segmentIndex: z.number().int().min(0).max(100).optional() })).max(8).default([]),
}).strict();
type LlmPersonaResponse = z.infer<typeof llmPersonaResponseSchema>;

const JSON_INSTRUCTIONS = `반드시 한국어로만 답하세요. JSON의 모든 문자열 값(reaction, blockers, questions, missingExplanations, improvements의 title/problem/action/example)은 자연스러운 한국어여야 합니다. 영어, 한국어와 영어의 혼용, 영어 문장, 로마자 설명을 사용하지 마세요. 고유명사나 제품명처럼 번역할 수 없는 용어만 원문 표기를 허용합니다. Transcript에 영어가 포함되어 있어도 평가와 개선안은 한국어로 작성하세요.
아래 모양의 JSON 객체 하나만 반환하세요. 마크다운 코드 펜스나 JSON 바깥의 설명을 붙이지 마세요:
{"comprehensionScore":0,"attentionScore":0,"reaction":"string","blockers":["string"],"questions":["string"],"focusSegmentIndexes":[0],"missingExplanations":["string"],"improvements":[{"title":"string","problem":"string","action":"string","example":"string","segmentIndex":0}]}
점수는 0에서 100 사이의 정수여야 합니다. focusSegmentIndexes와 segmentIndex는 0부터 시작하는 transcript 문장 번호입니다. 모든 판단은 transcript에 근거하세요.`;
const KOREAN_JSON_RULE = "모든 문자열 값은 자연스러운 한국어로 작성하세요. Transcript에 영어가 포함되어 있어도 구조 설명과 분석 문장은 한국어로 작성하세요. JSON 외의 설명, 마크다운, 영어 문장을 반환하지 마세요.";

function parseJsonContent(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

function requireKoreanStrings(values: string[]): void {
  if (values.some((value) => value.trim() && !/[가-힣]/.test(value))) {
    throw new Error("분석 문자열이 한국어가 아닙니다.");
  }
}

function validateKoreanPersona(response: LlmPersonaResponse): LlmPersonaResponse {
  requireKoreanStrings([
    response.reaction,
    ...response.blockers,
    ...response.questions,
    ...response.missingExplanations,
    ...response.improvements.flatMap((improvement) => [improvement.title, improvement.problem, improvement.action, improvement.example]),
  ]);
  return response;
}

async function callPersonaModel(model: JsonLanguageModelProvider, persona: FixedPersona, transcript: string): Promise<LlmPersonaResponse> {
  const system = `당신은 발표를 듣는 ${persona.name}의 관중 시뮬레이션입니다. 발표 평가자가 아니며, 실제 인간이라고 주장하지 마세요. 이 관중의 지식과 목표를 가진 사람이 발표를 순서대로 들을 때 실제로 이해나 집중이 흔들린 지점만 보고하세요. 배경지식이 적다는 이유만으로 어렵다고 판단하지 말고, 단어 선택·말버릇·사소한 문법처럼 이해와 집중에 영향이 없는 문제는 무시하세요. blockers와 improvements는 가장 중요한 것 최대 3개만 쓰세요.\n${personaPrompt(persona.name, PERSONA_MODELS[persona.id])}\n출력은 반드시 한국어로만 작성해야 합니다. ${JSON_INSTRUCTIONS}`;
  const user = `다음 Transcript만 근거로 분석하세요. 제목, 파일명, 음성 메타데이터 또는 Transcript 밖의 정보를 추측하지 마세요. Transcript에 영어가 있더라도 결과 JSON의 설명 문장은 모두 한국어로 작성하세요.\n\nTranscript:\n${transcript}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await model.completeJson({ system: attempt === 0 ? system : `${system} Your previous response was malformed; produce a fresh valid object matching the shape exactly.`, user, maxCompletionTokens: 700 });
      return validateKoreanPersona(llmPersonaResponseSchema.parse(parseJsonContent(raw)));
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (attempt === 1) throw new ProviderError("analysis_invalid_output", "The language-model provider returned invalid analysis data.", { cause: error });
    }
  }
  throw new ProviderError("analysis_invalid_output", "The language-model provider returned invalid analysis data.");
}

const structureModelResponseSchema = z.object({
  sections: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    startSegmentIndex: z.number().int().min(0).max(1000),
    endSegmentIndex: z.number().int().min(0).max(1000),
    summary: z.string().min(1),
  })).min(1).max(12),
}).strict();
type StructureModelResponse = z.infer<typeof structureModelResponseSchema>;

function validateKoreanStructure(response: StructureModelResponse): StructureModelResponse {
  requireKoreanStrings(response.sections.flatMap((section) => [section.title, section.summary]));
  return response;
}

const synthesisModelResponseSchema = z.object({
  headline: z.string().min(1),
  intendedKeyMessage: z.string().min(1),
  strengths: z.array(z.string().min(1)).max(6),
  discovery: analysisDiscoverySchema,
  issues: z.array(z.object({ sectionId: z.string().min(1), why: z.string().min(1), pattern: z.string().min(1) })).max(8).default([]),
}).strict();
type SynthesisModelResponse = z.infer<typeof synthesisModelResponseSchema>;

function validateKoreanSynthesis(response: SynthesisModelResponse): SynthesisModelResponse {
  requireKoreanStrings([response.headline, response.intendedKeyMessage, ...response.strengths, response.discovery.title, response.discovery.detail, ...response.issues.flatMap((issue) => [issue.why, issue.pattern])]);
  return response;
}

function fallbackStructure(segments: TranscriptSegment[]): StructureSection[] {
  const chunkSize = Math.max(1, Math.ceil(segments.length / Math.min(4, segments.length)));
  return Array.from({ length: Math.ceil(segments.length / chunkSize) }, (_, index) => {
    const slice = segments.slice(index * chunkSize, (index + 1) * chunkSize);
    return {
      id: `section-${index + 1}`,
      title: index === 0 ? "도입" : index === Math.ceil(segments.length / chunkSize) - 1 ? "마무리" : `핵심 구간 ${index}`,
      startSeconds: slice[0]!.startSeconds,
      endSeconds: slice[slice.length - 1]!.endSeconds,
      summary: "발표 transcript의 연속된 구간",
      segmentIds: slice.map((segment) => segment.id),
    } satisfies StructureSection;
  });
}

function normaliseStructure(model: StructureModelResponse, segments: TranscriptSegment[]): StructureSection[] {
  const byIndex = (index: number) => segments[Math.max(0, Math.min(segments.length - 1, index))]!;
  const sections = model.sections
    .map((section, index) => {
      const start = byIndex(Math.min(section.startSegmentIndex, section.endSegmentIndex));
      const end = byIndex(Math.max(section.startSegmentIndex, section.endSegmentIndex));
      return {
        id: section.id.trim() || `section-${index + 1}`,
        title: section.title.trim(),
        startSeconds: start.startSeconds,
        endSeconds: Math.max(start.endSeconds, end.endSeconds),
        summary: section.summary.trim(),
        segmentIds: segments.filter((segment) => segment.startSeconds >= start.startSeconds && segment.startSeconds <= end.startSeconds).map((segment) => segment.id),
      } satisfies StructureSection;
    })
    .filter((section) => section.title && section.summary && section.segmentIds.length > 0);
  return sections.length > 0 ? sections : fallbackStructure(segments);
}

function numberedTranscript(segments: TranscriptSegment[]): string {
  return segments.map((segment, index) => `[${index}] ${segment.text}`).join("\n");
}

async function callStructureModel(model: JsonLanguageModelProvider, segments: TranscriptSegment[]): Promise<{ structure?: StructureModelResponse; legacy?: LlmPersonaResponse }> {
  const system = `당신은 발표 구조 분석기입니다. 발표의 좋고 나쁨, 점수, 개선안, 관중 평가는 하지 마세요. 오직 발표가 어떤 구간으로 구성되어 있는지만 찾아야 합니다. ${KOREAN_JSON_RULE}
아래 JSON 형식만 반환하세요:
{"sections":[{"id":"intro","title":"도입","startSegmentIndex":0,"endSegmentIndex":1,"summary":"발표 주제와 문제 상황 소개"}]}
구간은 transcript의 문장 번호를 사용하고 서로 겹치지 않게 하세요. 최대 8개로 나누세요.`;
  const user = `다음 발표 transcript를 구조적으로 나누세요. 점수나 평가를 만들지 마세요.\n\n${numberedTranscript(segments)}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await model.completeJson({ system: attempt === 0 ? system : `${system} 이전 응답이 잘못되었습니다. 정확한 JSON만 반환하세요.`, user, maxCompletionTokens: 450 });
      const parsed = parseJsonContent(raw);
      const structure = structureModelResponseSchema.safeParse(parsed);
      if (structure.success) return { structure: validateKoreanStructure(structure.data) };
      const legacy = llmPersonaResponseSchema.safeParse(parsed);
      if (legacy.success) return { legacy: validateKoreanPersona(legacy.data) };
      throw new Error("invalid structure response");
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (attempt === 1) throw new ProviderError("analysis_invalid_output", "The structure analyzer returned invalid analysis data.", { cause: error });
    }
  }
  throw new ProviderError("analysis_invalid_output", "The structure analyzer returned invalid analysis data.");
}

function sectionExcerpts(structure: StructureSection[], segments: TranscriptSegment[]) {
  const byId = new Map(segments.map((segment) => [segment.id, segment]));
  return structure.map((section) => ({
    sectionId: section.id,
    title: section.title,
    startSeconds: section.startSeconds,
    transcript: section.segmentIds.map((id) => byId.get(id)?.text ?? "").join(" "),
  }));
}

/** One independent, sequential listening pass per persona: no persona sees another's output. */
async function callSimulationModel(model: JsonLanguageModelProvider, persona: FixedPersona, structure: StructureSection[], segments: TranscriptSegment[]): Promise<SimulationResponse> {
  const system = `당신은 ${persona.name}의 머릿속을 시뮬레이션하는 관중 시뮬레이션 엔진입니다. 당신은 발표 평가자가 아닙니다. 실제 인간이라고 주장하지 마세요.

${SIMULATION_SYSTEM_RULES}

${personaPrompt(persona.name, PERSONA_MODELS[persona.id])}`;
  const user = presentationContext(sectionExcerpts(structure, segments));
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await model.completeJson({ system: attempt === 0 ? system : `${system}\n이전 응답이 잘못되었습니다. 정확한 JSON만 반환하세요.`, user, maxCompletionTokens: 2600 });
      const result = simulationResponseSchema.safeParse(parseJsonContent(raw));
      if (!result.success) throw new Error("invalid simulation response");
      requireKoreanStrings(simulationKoreanStrings(result.data));
      return result.data;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (attempt === 1) throw new ProviderError("analysis_invalid_output", "The audience simulator returned invalid analysis data.", { cause: error });
    }
  }
  throw new ProviderError("analysis_invalid_output", "The audience simulator returned invalid analysis data.");
}

const PERSONA_NAMES = Object.fromEntries(FIXED_PERSONAS.map((persona) => [persona.id, persona.name])) as Record<PersonaId, string>;

type SimulationRun = {
  talkSeconds: number;
  simulations: PersonaSimulation[];
  issues: AudienceIssue[];
};

/** Normalise raw persona passes into speaking order, drop unknown/duplicate sections and calibrate certainty. */
function buildSimulationRun(structure: StructureSection[], segments: TranscriptSegment[], transcript: string, responses: readonly SimulationResponse[]): SimulationRun {
  const order = new Map(structure.map((section, index) => [section.id, index]));
  // Too little speech to know what a listener would have understood: lower confidence one step.
  const thinEvidence = segments.length < 3 || transcript.replace(/\s+/g, "").length < 80;
  const simulations = responses.flatMap((response, personaIndex) => {
    const personaId = FIXED_PERSONAS[personaIndex]!.id;
    const seen = new Set<string>();
    return response.sections
      .filter((section) => order.has(section.sectionId) && !seen.has(section.sectionId) && seen.add(section.sectionId))
      .sort((a, b) => order.get(a.sectionId)! - order.get(b.sectionId)!)
      .map((section) => ({ personaId, section: { ...section, likelihood: calibrateLikelihood(section.likelihood, thinEvidence) } }));
  });
  const talkSeconds = segments[segments.length - 1]?.endSeconds ?? 0;
  return { talkSeconds, simulations, issues: selectIssues(structure, simulations, talkSeconds) };
}

async function callSynthesisModel(model: JsonLanguageModelProvider, structure: StructureSection[], run: SimulationRun): Promise<SynthesisModelResponse | null> {
  const system = `당신은 발표 분석 통합기입니다. 서로 독립적으로 시뮬레이션된 관중들의 반응 패턴을 비교합니다. 의견을 평균 내거나 "몇 명 중 몇 명이 문제를 발견했다"처럼 머릿수로 요약하지 마세요. 같은 구간에서 관중의 반응이 왜 같거나 달랐는지 원인을 분석하세요. 예: "개념 자체의 난이도보다 그 개념이 왜 필요한지 설명하는 연결이 부족해서, 전문가는 기존 지식으로 보완했지만 비전공 관중은 연결을 스스로 만들기 어려웠을 가능성이 있다."
하위 시뮬레이션에 없는 사실을 추가하지 마세요. 시뮬레이션 결과를 사실처럼 단정하지 말고 "가능성이 높아요/있어요"처럼 표현하세요. 점수나 평가 등급을 만들지 마세요. 주요 문제는 이미 중요도 순으로 골라져 있으니 새로 추가하거나 빼지 마세요. ${KOREAN_JSON_RULE}
아래 JSON 형식만 반환하세요:
{"headline":"관중들이 발표를 어떻게 경험했는지 한 문장","intendedKeyMessage":"발표자가 전달하려 한 핵심 메시지","strengths":["관중에게 잘 전달된 점"],"discovery":{"kind":"common","title":"가장 큰 발견","detail":"원인 중심 설명","sectionId":"intro","personaIds":["beginner"],"evidence":"근거 문장"},"issues":[{"sectionId":"intro","why":"왜 이 문제가 생겼는가","pattern":"관중마다 반응이 같거나 달랐던 원인"}]}
personaIds는 beginner, peer, specialist만 사용하세요. issues에는 주어진 주요 문제의 sectionId만 순서대로 쓰세요.`;
  const view = (item: PersonaSimulation) => ({
    personaId: item.personaId,
    reaction: item.section.reaction,
    understanding: item.section.understanding,
    agreement: item.section.agreement,
    cause: item.section.cause,
    stateBefore: item.section.stateBefore,
    stateAfter: item.section.stateAfter,
    evidence: item.section.evidence,
    likelihood: item.section.likelihood,
  });
  const majorIssues = run.issues.map((issue) => ({
    sectionId: issue.section.id,
    title: issue.section.title,
    timestamp: formatTimestamp(issue.section.startSeconds),
    salience: issue.level,
    listeners: issue.all.map(view),
  }));
  const journey = run.simulations
    .filter((item) => item.section.reaction !== "NO_SIGNIFICANT_CHANGE")
    .map((item) => ({ sectionId: item.section.sectionId, ...view(item) }));
  const user = `발표 구조:\n${JSON.stringify(structure.map(({ id, title, summary }) => ({ id, title, summary })))}\n\n주요 문제(중요도 순):\n${JSON.stringify(majorIssues)}\n\n의미 있는 반응 변화:\n${JSON.stringify(journey)}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await model.completeJson({ system: attempt === 0 ? system : `${system} 이전 응답이 잘못되었습니다. 정확한 JSON만 반환하세요.`, user, maxCompletionTokens: 1100 });
      const parsed = parseJsonContent(raw);
      const synthesis = synthesisModelResponseSchema.safeParse(parsed);
      if (synthesis.success) return validateKoreanSynthesis(synthesis.data);
      if (llmPersonaResponseSchema.safeParse(parsed).success) return null;
      throw new Error("invalid synthesis response");
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (attempt === 1) return null;
    }
  }
  throw new ProviderError("analysis_invalid_output", "The cross-check analyzer returned invalid analysis data.");
}

function discoveryFromIssues(issues: AudienceIssue[]): AnalysisDiscovery {
  const top = issues[0];
  if (!top) {
    return analysisDiscoverySchema.parse({ kind: "common", title: "핵심 흐름은 대체로 전달됐어요", detail: "관중마다 따로 들어 봤지만, 이해나 집중이 크게 흔들린 구간은 발견되지 않았어요.", personaIds: [] });
  }
  const everyone = top.affected.length === top.all.length && top.all.length > 1;
  return analysisDiscoverySchema.parse({
    kind: everyone ? "common" : "split",
    title: everyone ? "여러 관중이 같은 구간에서 멈췄어요" : "관중마다 받아들인 정도가 달랐어요",
    detail: patternFallback(top, PERSONA_NAMES),
    sectionId: top.section.id,
    personaIds: top.affected.map((item) => item.personaId),
    evidence: top.affected[0]?.section.evidence,
  });
}

const EXPLANATION_CAUSES = new Set<ConfusionType>(["TERM_CONFUSION", "CONCEPT_CONFUSION", "CONTEXT_GAP", "PURPOSE_CONFUSION", "REFERENCE_GAP"]);

function deepProviderResult(
  transcript: string,
  segments: TranscriptSegment[],
  structure: StructureSection[],
  responses: readonly SimulationResponse[],
  run: SimulationRun,
  synthesis: SynthesisModelResponse | null,
): AnalysisResult {
  const { simulations, issues } = run;
  const knownSectionIds = new Set(structure.map((section) => section.id));
  const sectionAnalyses = simulations.flatMap(({ personaId, section }) => {
    const issue = isIssue(section);
    const parsed = sectionAudienceAnalysisSchema.safeParse({
      sectionId: section.sectionId,
      personaId,
      understanding: section.understanding,
      ...internalScores(section),
      reaction: section.naturalReaction,
      evidence: section.evidence,
      reason: section.stateAfter,
      blockers: issue ? [section.stateAfter] : [],
      questions: section.question && section.salience.natural ? [section.question] : [],
      needsExample: issue && (section.cause === "EXAMPLE_GAP" || section.mentalModelGap !== null),
      improvement: issue && section.improvement ? { title: section.improvement.title, problem: section.stateAfter, action: section.improvement.action, example: section.improvement.example } : null,
      simulation: {
        stateBefore: section.stateBefore,
        newInformation: section.newInformation,
        stateAfter: section.stateAfter,
        reactionType: section.reaction,
        agreement: section.agreement,
        cause: section.cause,
        likelihood: section.likelihood,
        salience: salienceLevel(section),
        mentalModelGap: section.mentalModelGap,
        recovery: section.recovery,
      },
    });
    return parsed.success ? [parsed.data] : [];
  });

  const synthesisIssues = new Map((synthesis?.issues ?? []).map((issue) => [issue.sectionId, issue]));
  const difficultSections = issues.map((issue) => {
    const lead = issue.affected[0]!.section;
    const explained = synthesisIssues.get(issue.section.id);
    return {
      segmentId: issue.section.segmentIds[0]!,
      sectionId: issue.section.id,
      reason: explained?.why ?? `${issue.cause ? `${CONFUSION_LABEL[issue.cause]}: ` : ""}${lead.stateAfter}`,
      personaIds: issue.affected.map((item) => item.personaId),
      cause: issue.cause,
      likelihood: issue.likelihood,
      salience: issue.level,
      pattern: explained?.pattern ?? patternFallback(issue, PERSONA_NAMES),
      evidence: lead.evidence,
    };
  });

  const improvements = issues.flatMap((issue) => {
    const source = issue.affected.find((item) => item.section.improvement)?.section;
    if (!source?.improvement) return [];
    return [{ id: `deep-improvement-${issue.section.id}`, title: source.improvement.title, problem: source.stateAfter, action: source.improvement.action, example: source.improvement.example, sourceSegmentIds: issue.section.segmentIds }];
  });

  const explanationGaps = issues.flatMap((issue) => {
    if (!issue.cause || !EXPLANATION_CAUSES.has(issue.cause)) return [];
    const lead = issue.affected.find((item) => item.section.cause === issue.cause)!.section;
    return [{
      term: lead.newInformation,
      why: lead.stateAfter,
      suggestion: lead.improvement?.action ?? lead.recovery ?? "처음 나올 때 이 내용이 어떤 역할을 하는지 한 문장으로 먼저 설명해 주세요.",
      sectionId: issue.section.id,
      segmentId: issue.section.segmentIds[0]!,
      personaIds: issue.affected.map((item) => item.personaId),
    }];
  });

  // Analogy suggestions only where the listener passed the four-condition check and the gap mattered.
  const mentalModelGaps = issues.flatMap((issue) => {
    const withGap = issue.affected.filter((item) => item.section.mentalModelGap);
    const gap = withGap[0]?.section.mentalModelGap;
    if (!gap) return [];
    return [{ ...gap, sectionId: issue.section.id, segmentId: issue.section.segmentIds[0]!, personaIds: withGap.map((item) => item.personaId) }];
  });

  const questions = naturalQuestions(structure, simulations);
  const personas = FIXED_PERSONAS.map((persona, index) => {
    const own = simulations.filter((item) => item.personaId === persona.id).map((item) => item.section);
    const scores = own.map(internalScores);
    const average = (key: "comprehensionScore" | "attentionScore") => Math.round(scores.reduce((sum, item) => sum + item[key], 0) / Math.max(scores.length, 1));
    return {
      id: persona.id,
      name: persona.name,
      perspective: persona.perspective,
      comprehensionScore: scores.length ? average("comprehensionScore") : 75,
      attentionScore: scores.length ? average("attentionScore") : 75,
      reaction: responses[index]!.overallExperience,
      blockers: uniqueStrings(own.filter(isIssue).map((section) => section.stateAfter)),
      questions: questions.filter((question) => question.personaIds.includes(persona.id)).map((question) => question.question),
    };
  });

  const synthesisDiscovery = synthesis?.discovery && (!synthesis.discovery.sectionId || knownSectionIds.has(synthesis.discovery.sectionId)) ? synthesis.discovery : null;
  const discovery = synthesisDiscovery ?? discoveryFromIssues(issues);
  const top = issues[0];
  const overview = synthesis?.headline
    ?? (top
      ? `${top.section.title}에서 ${top.affected.map((item) => PERSONA_NAMES[item.personaId]).join(", ")}의 이해 연결이 약해졌을 가능성이 있어요.`
      : "관중 모두 발표의 흐름을 크게 놓치지 않았을 가능성이 높아요.");
  const comprehensionScore = Math.round(personas.reduce((sum, persona) => sum + persona.comprehensionScore, 0) / personas.length);
  const attentionScore = Math.round(personas.reduce((sum, persona) => sum + persona.attentionScore, 0) / personas.length);
  return analysisResultSchema.parse({
    version: "1.0",
    mode: "provider",
    disclaimer: "Generated from this transcript by the configured STT/LLM provider as a simulated audience; feedback is informational.",
    generatedAt: new Date().toISOString(),
    summary: {
      overview,
      comprehensionScore,
      attentionScore,
      keyMessageScore: comprehensionScore,
      intendedKeyMessage: synthesis?.intendedKeyMessage ?? overview,
      strengths: synthesis?.strengths ?? [],
    },
    transcript: { text: transcript, segments },
    personas,
    difficultSections,
    missingExplanations: explanationGaps.map((gap) => gap.term),
    improvements,
    structure: { sections: structure },
    sectionAnalyses,
    discovery,
    keyMoments: keyMoments(structure, simulations, PERSONA_NAMES),
    naturalQuestions: questions,
    explanationGaps,
    mentalModelGaps,
  });
}

function uniqueStrings(values: string[]): string[] { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }

function providerResult(presentation: Pick<StoredPresentation, "id" | "title" | "durationSeconds">, transcript: string, segments: TranscriptSegment[], responses: readonly LlmPersonaResponse[]): AnalysisResult {
  const personas = FIXED_PERSONAS.map((persona, index) => {
    const response = responses[index]!;
    return { id: persona.id, name: persona.name, perspective: persona.perspective, comprehensionScore: response.comprehensionScore, attentionScore: response.attentionScore, reaction: response.reaction, blockers: response.blockers, questions: response.questions };
  });
  const allFocusIndexes = responses.flatMap((response) => [...response.focusSegmentIndexes, ...response.improvements.flatMap((improvement) => improvement.segmentIndex === undefined ? [] : [improvement.segmentIndex])]).filter((index) => index < segments.length);
  const focusIndexes = [...new Set(allFocusIndexes)].slice(0, 8);
  const relevantBlockers = responses.flatMap((response) => response.blockers);
  const difficultSections = focusIndexes.map((index) => ({ segmentId: segments[index]!.id, reason: relevantBlockers[focusIndexes.indexOf(index)] ?? relevantBlockers[0] ?? "Several audience perspectives may need more context here." }));
  const improvements = responses.flatMap((response, personaIndex) => response.improvements.map((improvement, index) => {
    const segmentIndex = improvement.segmentIndex !== undefined && improvement.segmentIndex < segments.length ? improvement.segmentIndex : focusIndexes[0];
    return { id: `provider-improvement-${personaIndex + 1}-${index + 1}`, title: improvement.title, problem: improvement.problem, action: improvement.action, example: improvement.example, sourceSegmentIds: segmentIndex === undefined ? [] : [segments[segmentIndex]!.id] };
  }));
  const comprehensionScore = Math.round(personas.reduce((sum, persona) => sum + persona.comprehensionScore, 0) / personas.length);
  const attentionScore = Math.round(personas.reduce((sum, persona) => sum + persona.attentionScore, 0) / personas.length);
  const overview = relevantBlockers[0]
    ? `발표의 핵심 흐름은 전달됐지만, ${relevantBlockers[0]} 때문에 이해가 끊겼습니다.`
    : "발표의 핵심 흐름은 전달됐지만, 관중별로 더 확인할 지점이 남았습니다.";
  return analysisResultSchema.parse({ version: "1.0", mode: "provider", disclaimer: "Generated from this transcript by the configured STT/LLM provider; feedback is informational.", generatedAt: new Date().toISOString(), summary: { overview, comprehensionScore, attentionScore, keyMessageScore: comprehensionScore }, transcript: { text: transcript, segments }, personas, difficultSections, missingExplanations: uniqueStrings(responses.flatMap((response) => response.missingExplanations)).slice(0, 12), improvements });
}

export class ProviderPresentationAnalysisProvider implements PresentationAnalysisProvider {
  constructor(private readonly speechToText: SpeechToTextProvider, private readonly languageModel: JsonLanguageModelProvider) {}

  async analyze({ presentation, onStage }: { presentation: Pick<StoredPresentation, "id" | "title" | "durationSeconds" | "transcript" | "audio" | "audioBytes">; onStage?: (stage: ProgressStage, context?: ProgressContext) => void }): Promise<AnalysisResult> {
    let transcript = presentation.transcript?.trim() ?? "";
    let speechSegments: SpeechToTextResult["segments"];
    if (!transcript) {
      if (!presentation.audioBytes?.byteLength) throw new ProviderError("analysis_empty_transcript", "No transcript or retained audio is available for analysis.");
      onStage?.("transcribing");
      const transcription = await this.speechToText.transcribe({ audio: presentation.audioBytes, metadata: presentation.audio });
      transcript = transcription.text.trim();
      speechSegments = transcription.segments;
    }
    if (!transcript) throw new ProviderError("analysis_empty_transcript", "The recording did not contain recognizable speech.");
    const segments: TranscriptSegment[] = speechSegments?.length ? speechSegments.map((segment, index) => ({ id: `segment-${index + 1}`, startSeconds: Math.max(0, segment.startSeconds), endSeconds: Math.max(segment.startSeconds + 0.1, segment.endSeconds), text: segment.text, difficulty: "low" as const, issue: null })) : neutralSegments(transcript);
    onStage?.("structuring", { phase: "structure", message: "발표가 도입·핵심 내용·마무리로 어떻게 이어지는지 파악하고 있어요.", pipeline: pipelineSnapshot([], null, null, "structure") });
    const structureResponse = await callStructureModel(this.languageModel, segments);
    if (structureResponse.legacy) {
      onStage?.("evaluating", { phase: "persona", message: "세 관중의 관점에서 발표를 듣고 있어요." });
      const responses = await Promise.all(FIXED_PERSONAS.map((persona) => callPersonaModel(this.languageModel, persona, transcript)));
      onStage?.("cross_check", { phase: "cross_check", message: "관중들의 반응을 비교하고 있어요." });
      onStage?.("finalizing", { phase: "synthesis", message: "최종 발표 피드백을 정리하고 있어요." });
      return providerResult(presentation, transcript, segments, responses);
    }

    const structure = normaliseStructure(structureResponse.structure!, segments);
    onStage?.("segmenting", {
      phase: "section",
      sectionId: structure[0]?.id,
      message: "발표를 분석할 핵심 구간으로 나누고 있어요.",
      pipeline: pipelineSnapshot(structure, structure[0]?.id ?? null, null, "section"),
    });
    const responses: SimulationResponse[] = [];
    const insights: AnalysisPipelineSnapshot["insights"] = [];
    for (const persona of FIXED_PERSONAS) {
      const completedPersonaIds = responses.map((_, index) => FIXED_PERSONAS[index]!.id);
      onStage?.("evaluating", {
        phase: "persona",
        personaId: persona.id,
        message: `${persona.name}이 발표를 처음부터 순서대로 들으며 이해가 어떻게 바뀌는지 따라가고 있어요.`,
        pipeline: pipelineSnapshot(structure, null, persona.id, "persona", personaCells(structure, completedPersonaIds, persona.id), [...insights]),
      });
      const response = await callSimulationModel(this.languageModel, persona, structure, segments);
      responses.push(response);
      // Surface only a salient change this listener actually had, never a guess.
      const firstIssue = response.sections.find((section) => structure.some((s) => s.id === section.sectionId) && isIssue(section));
      if (firstIssue) {
        insights.push({ id: `insight-${persona.id}`, text: firstIssue.naturalReaction, sectionId: firstIssue.sectionId, personaId: `p-${persona.id}` });
      }
    }
    const run = buildSimulationRun(structure, segments, transcript, responses);
    onStage?.("cross_check", {
      phase: "cross_check",
      message: "관중마다 반응이 같거나 달랐던 원인을 비교하고, 실제로 중요한 문제만 추리고 있어요.",
      pipeline: pipelineSnapshot(structure, null, null, "cross_check", personaCells(structure, FIXED_PERSONAS.map((persona) => persona.id), null), [...insights]),
    });
    const synthesis = await callSynthesisModel(this.languageModel, structure, run);
    onStage?.("finalizing", {
      phase: "synthesis",
      message: "발표자가 먼저 고칠 핵심 문제를 정리하고 있어요.",
      pipeline: pipelineSnapshot(structure, null, null, null, personaCells(structure, FIXED_PERSONAS.map((persona) => persona.id), null), [...insights]),
    });
    return deepProviderResult(transcript, segments, structure, responses, run, synthesis);
  }
}

const providerGlobal = globalThis as typeof globalThis & { __virtualAudienceProviderOverride?: PresentationAnalysisProvider };
export const defaultAnalysisProvider = new MockPresentationAnalysisProvider();
export function setAnalysisProvider(provider: PresentationAnalysisProvider): void { providerGlobal.__virtualAudienceProviderOverride = provider; }
export function getAnalysisProvider(): PresentationAnalysisProvider {
  if (providerGlobal.__virtualAudienceProviderOverride) return providerGlobal.__virtualAudienceProviderOverride;
  const configured = createConfiguredProviders();
  return configured ? new ProviderPresentationAnalysisProvider(configured.speechToText, configured.languageModel) : defaultAnalysisProvider;
}
export function createAnalysisProviderFromEnv(env: ProviderEnv = process.env): PresentationAnalysisProvider {
  const configured = createConfiguredProviders(env);
  return configured ? new ProviderPresentationAnalysisProvider(configured.speechToText, configured.languageModel) : defaultAnalysisProvider;
}

const configuredDelay = Number(process.env.ANALYSIS_DELAY_MS ?? "250");
const ANALYSIS_DELAY_MS = Number.isFinite(configuredDelay) && configuredDelay >= 0 ? configuredDelay : 250;
const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
function failureFor(error: unknown): { code: string; message: string } {
  if (error instanceof ProviderError) {
    if (error.code === "analysis_invalid_output") return { code: "analysis_failed", message: "The analysis provider returned invalid analysis data." };
    if (error.code === "analysis_provider_error") return { code: "analysis_failed", message: "The analysis provider could not complete the analysis." };
    return { code: error.code, message: error.message };
  }
  if (error instanceof z.ZodError) return { code: "analysis_failed", message: "The analysis provider returned an invalid result." };
  return { code: "analysis_failed", message: "The analysis provider could not complete the analysis." };
}

export async function runAnalysis(id: string, provider?: PresentationAnalysisProvider): Promise<void> {
  const record = presentationRepository.get(id);
  if (!record) return;
  try {
    const activeProvider = provider ?? getAnalysisProvider();
    presentationRepository.update(id, { status: "analyzing", stage: "transcribing", failedStage: null, progress: 20, phase: null, currentSectionId: null, currentPersonaId: null, message: "음성을 문장으로 옮기고 있어요.", pipeline: null, error: null });
    await delay(ANALYSIS_DELAY_MS);
    const current = presentationRepository.get(id);
    if (!current) return;
    const result = await activeProvider.analyze({
      presentation: current,
      onStage: (stage, context) => {
        const progress = { transcribing: 20, structuring: 35, segmenting: 45, evaluating: 65, cross_check: 82, finalizing: 92 }[stage];
        presentationRepository.update(id, {
          stage,
          progress,
          phase: context?.phase ?? null,
          currentSectionId: context?.sectionId ?? null,
          currentPersonaId: context?.personaId ?? null,
          message: context?.message ?? null,
          pipeline: context?.pipeline ? { ...context.pipeline, message: context.message } : context?.pipeline,
        });
      },
    });
    const validated = analysisResultSchema.parse(result);
    presentationRepository.update(id, { transcript: validated.transcript.text, status: "complete", stage: "complete", failedStage: null, progress: 100, phase: null, currentSectionId: null, currentPersonaId: null, message: "분석이 끝났어요.", result: validated, error: null });
  } catch (error) {
    const failure = failureFor(error);
    console.error("Presentation analysis failed", { code: failure.code });
    const failedStage = presentationRepository.get(id)?.stage ?? "failed";
    presentationRepository.update(id, { status: "failed", stage: "failed", failedStage, progress: 100, error: failure });
  }
}

export function startAnalysis(id: string): void {
  const record = presentationRepository.get(id);
  if (!record) throw new ApiError(404, "presentation_not_found", `Presentation '${id}' was not found.`);
  if (record.status === "analyzing") throw new ApiError(409, "analysis_in_progress", "Analysis is already in progress.");
  if (record.status === "complete") throw new ApiError(409, "analysis_already_complete", "Analysis has already completed.");
  presentationRepository.update(id, { status: "analyzing", stage: "queued", failedStage: null, progress: 5, phase: null, currentSectionId: null, currentPersonaId: null, message: "분석을 준비하고 있어요.", pipeline: null, error: null });
  void runAnalysis(id);
}
