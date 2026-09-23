import { z } from "zod";
import { ApiError } from "./errors";
import { presentationRepository, type StoredPresentation } from "./store";
import { analysisResultSchema, type AnalysisResult, type TranscriptSegment } from "./schemas";
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
  }): Promise<AnalysisResult>;
}

type FixedPersona = {
  id: "beginner" | "peer" | "specialist";
  name: "비전공 관중" | "일반 관중" | "전문가 관중";
  perspective: string;
  instructions: string;
};

export const FIXED_PERSONAS: readonly FixedPersona[] = [
  { id: "beginner", name: "비전공 관중", perspective: "관련 배경지식이 많지 않아 발표자의 설명만으로 이해하려는 관중", instructions: "전문 용어를 모르는 관중의 입장에서 쉬운 말, 배경 설명, 구체적인 예시가 충분한지 살핍니다." },
  { id: "peer", name: "일반 관중", perspective: "주제에 어느 정도 관심과 일반적인 업무 경험이 있는 관중", instructions: "발표의 흐름, 핵심 메시지, 집중을 유지할 수 있는 구조와 실용성을 살핍니다." },
  { id: "specialist", name: "전문가 관중", perspective: "주제의 세부 내용과 근거, 한계를 검토할 수 있는 전문가 관중", instructions: "주장의 정확성, 근거, 전제, 예외와 방법의 구체성이 충분한지 살핍니다." },
] as const;

const SAMPLE_TRANSCRIPT =
  "Today I will explain how our service turns presentation recordings into audience-centered feedback. First, we identify the key message. Then, we compare the transcript with the needs of beginner, peer, and specialist listeners. Finally, we recommend one concrete revision before the live talk.";

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
    issue: index === 1 ? "The key message is named, but its practical consequence is not explained yet." : null,
  }));
}

export class MockPresentationAnalysisProvider implements PresentationAnalysisProvider {
  async analyze({ presentation }: { presentation: Pick<StoredPresentation, "id" | "title" | "durationSeconds" | "transcript" | "audio" | "audioBytes"> }): Promise<AnalysisResult> {
    const text = presentation.transcript?.trim() || SAMPLE_TRANSCRIPT;
    const segments = sentenceSegments(text);
    return analysisResultSchema.parse({
      version: "1.0", mode: "mock", disclaimer: "Sample/mock analysis for development only; this is not real AI feedback.", generatedAt: new Date().toISOString(),
      summary: { overview: "The main idea is promising, but one important concept would benefit from a concrete example before the live presentation.", comprehensionScore: 72, attentionScore: 78, keyMessageScore: 68 },
      transcript: { text, segments },
      personas: [
        { id: "beginner", name: "비전공 관중", perspective: FIXED_PERSONAS[0].perspective, comprehensionScore: 64, attentionScore: 75, reaction: "I understand the goal, but I need one plain-language example to connect the steps.", blockers: ["The phrase audience-centered feedback is not defined."], questions: ["What would this change in a real presentation?"] },
        { id: "peer", name: "일반 관중", perspective: FIXED_PERSONAS[1].perspective, comprehensionScore: 78, attentionScore: 82, reaction: "The workflow is easy to follow; the recommendation would be stronger with evidence from a sample talk.", blockers: ["The transition from analysis to revision is abrupt."], questions: ["How do you choose which issue to fix first?"] },
        { id: "specialist", name: "전문가 관중", perspective: FIXED_PERSONAS[2].perspective, comprehensionScore: 73, attentionScore: 77, reaction: "The evaluation perspectives are distinct, but the method behind the comparison needs one boundary or caveat.", blockers: ["No limitation is stated for the simulated audience perspectives."], questions: ["How should presenters interpret disagreement between personas?"] },
      ],
      difficultSections: [{ segmentId: segments[Math.min(1, segments.length - 1)]!.id, reason: "The concept is named before it is grounded in a concrete example." }],
      missingExplanations: ["Define audience-centered feedback in plain language.", "Show one before-and-after revision."],
      improvements: [
        { id: "improvement-1", title: "Ground the key message with an example", problem: "Listeners can repeat the workflow but cannot yet picture the outcome.", action: "Add one short example immediately after introducing audience-centered feedback.", example: "For example, if a beginner misses the term latency, replace it with the time a request waits before it starts.", sourceSegmentIds: [segments[Math.min(1, segments.length - 1)]!.id] },
        { id: "improvement-2", title: "Explain how to prioritize feedback", problem: "The final recommendation does not tell the presenter which issue to fix first.", action: "State that repeated comprehension blockers come before stylistic refinements.", example: "Start with the concept that both beginner and peer listeners found unclear.", sourceSegmentIds: [segments[Math.min(2, segments.length - 1)]!.id] },
      ],
    });
  }
}

const llmPersonaResponseSchema = z.object({
  comprehensionScore: z.number().int().min(0).max(100), attentionScore: z.number().int().min(0).max(100), reaction: z.string().min(1),
  blockers: z.array(z.string().min(1)).max(8), questions: z.array(z.string().min(1)).max(8), focusSegmentIndexes: z.array(z.number().int().min(0).max(100)).max(8).default([]), missingExplanations: z.array(z.string().min(1)).max(8).default([]),
  improvements: z.array(z.object({ title: z.string().min(1), problem: z.string().min(1), action: z.string().min(1), example: z.string().min(1), segmentIndex: z.number().int().min(0).max(100).optional() })).max(8).default([]),
}).strict();
type LlmPersonaResponse = z.infer<typeof llmPersonaResponseSchema>;

const JSON_INSTRUCTIONS = `Return only one valid JSON object with this exact shape. Do not use markdown fences or extra text:
{"comprehensionScore":0,"attentionScore":0,"reaction":"string","blockers":["string"],"questions":["string"],"focusSegmentIndexes":[0],"missingExplanations":["string"],"improvements":[{"title":"string","problem":"string","action":"string","example":"string","segmentIndex":0}]}
Scores are integers from 0 to 100. focusSegmentIndexes and segmentIndex refer to the numbered transcript sentences, starting at 0. Keep every observation grounded in the transcript.`;

function parseJsonContent(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

async function callPersonaModel(model: JsonLanguageModelProvider, persona: FixedPersona, transcript: string): Promise<LlmPersonaResponse> {
  const system = `You are ${persona.name}, one of exactly three fixed audience perspectives for a presentation review. ${persona.instructions} ${JSON_INSTRUCTIONS}`;
  const user = `Analyze only this transcript. Do not infer from a title, filename, audio metadata, or any information outside this transcript.\n\nTranscript:\n${transcript}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await model.completeJson({ system: attempt === 0 ? system : `${system} Your previous response was malformed; produce a fresh valid object matching the shape exactly.`, user });
      return llmPersonaResponseSchema.parse(parseJsonContent(raw));
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (attempt === 1) throw new ProviderError("analysis_invalid_output", "The language-model provider returned invalid analysis data.", { cause: error });
    }
  }
  throw new ProviderError("analysis_invalid_output", "The language-model provider returned invalid analysis data.");
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
  return analysisResultSchema.parse({ version: "1.0", mode: "provider", disclaimer: "Generated from this transcript by the configured STT/LLM provider; feedback is informational.", generatedAt: new Date().toISOString(), summary: { overview: `세 관중의 반응을 종합하면 발표의 이해도는 ${comprehensionScore}점, 집중도는 ${attentionScore}점입니다. 가장 많이 반복된 이해의 걸림돌부터 보완해 보세요.`, comprehensionScore, attentionScore, keyMessageScore: comprehensionScore }, transcript: { text: transcript, segments }, personas, difficultSections, missingExplanations: uniqueStrings(responses.flatMap((response) => response.missingExplanations)).slice(0, 12), improvements });
}

export class ProviderPresentationAnalysisProvider implements PresentationAnalysisProvider {
  constructor(private readonly speechToText: SpeechToTextProvider, private readonly languageModel: JsonLanguageModelProvider) {}

  async analyze({ presentation }: { presentation: Pick<StoredPresentation, "id" | "title" | "durationSeconds" | "transcript" | "audio" | "audioBytes"> }): Promise<AnalysisResult> {
    let transcript = presentation.transcript?.trim() ?? "";
    let speechSegments: SpeechToTextResult["segments"];
    if (!transcript) {
      if (!presentation.audioBytes?.byteLength) throw new ProviderError("analysis_empty_transcript", "No transcript or retained audio is available for analysis.");
      const transcription = await this.speechToText.transcribe({ audio: presentation.audioBytes, metadata: presentation.audio });
      transcript = transcription.text.trim();
      speechSegments = transcription.segments;
    }
    if (!transcript) throw new ProviderError("analysis_empty_transcript", "The recording did not contain recognizable speech.");
    const segments: TranscriptSegment[] = speechSegments?.length ? speechSegments.map((segment, index) => ({ id: `segment-${index + 1}`, startSeconds: Math.max(0, segment.startSeconds), endSeconds: Math.max(segment.startSeconds + 0.1, segment.endSeconds), text: segment.text, difficulty: "low" as const, issue: null })) : sentenceSegments(transcript);
    const responses = await Promise.all(FIXED_PERSONAS.map((persona) => callPersonaModel(this.languageModel, persona, transcript)));
    return providerResult(presentation, transcript, segments, responses);
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
    return error.code === "analysis_invalid_output" ? { code: "analysis_failed", message: "The analysis provider returned invalid analysis data." } : { code: error.code, message: error.message };
  }
  if (error instanceof z.ZodError) return { code: "analysis_failed", message: "The analysis provider returned an invalid result." };
  return { code: "analysis_provider_error", message: "The analysis provider could not complete the analysis." };
}

export async function runAnalysis(id: string, provider?: PresentationAnalysisProvider): Promise<void> {
  const record = presentationRepository.get(id);
  if (!record) return;
  try {
    const activeProvider = provider ?? getAnalysisProvider();
    presentationRepository.update(id, { status: "analyzing", stage: "transcribing", progress: 20, error: null });
    await delay(ANALYSIS_DELAY_MS);
    const current = presentationRepository.get(id);
    if (!current) return;
    presentationRepository.update(id, { stage: "evaluating", progress: 60 });
    const result = await activeProvider.analyze({ presentation: current });
    const validated = analysisResultSchema.parse(result);
    presentationRepository.update(id, { transcript: validated.transcript.text, status: "complete", stage: "complete", progress: 100, result: validated, error: null });
  } catch (error) {
    const failure = failureFor(error);
    console.error("Presentation analysis failed", { code: failure.code });
    presentationRepository.update(id, { status: "failed", stage: "failed", progress: 100, error: failure });
  }
}

export function startAnalysis(id: string): void {
  const record = presentationRepository.get(id);
  if (!record) throw new ApiError(404, "presentation_not_found", `Presentation '${id}' was not found.`);
  if (record.status === "analyzing") throw new ApiError(409, "analysis_in_progress", "Analysis is already in progress.");
  if (record.status === "complete") throw new ApiError(409, "analysis_already_complete", "Analysis has already completed.");
  presentationRepository.update(id, { status: "analyzing", stage: "queued", progress: 5, error: null });
  void runAnalysis(id);
}
