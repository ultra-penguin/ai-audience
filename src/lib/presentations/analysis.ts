import { z } from "zod";
import { ApiError } from "./errors";
import { presentationRepository, type StoredPresentation } from "./store";
import { analysisResultSchema, type AnalysisResult } from "./schemas";

export interface PresentationAnalysisProvider {
  /**
   * Replace this provider with a real STT + persona analysis adapter.
   * The API only depends on this stable input/output contract.
   */
  analyze(input: {
    presentation: Pick<StoredPresentation, "id" | "title" | "durationSeconds" | "transcript" | "audio">;
  }): Promise<AnalysisResult>;
}

const SAMPLE_TRANSCRIPT =
  "Today I will explain how our service turns presentation recordings into audience-centered feedback. First, we identify the key message. Then, we compare the transcript with the needs of beginner, peer, and specialist listeners. Finally, we recommend one concrete revision before the live talk.";

function sentenceSegments(text: string) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) ?? [text];
  const secondsPerSegment = 12;
  return sentences.map((sentence, index) => ({
    id: `segment-${index + 1}`,
    startSeconds: index * secondsPerSegment,
    endSeconds: (index + 1) * secondsPerSegment,
    text: sentence,
    difficulty: index === 1 ? ("high" as const) : index === 2 ? ("medium" as const) : ("low" as const),
    issue: index === 1 ? "The key message is named, but its practical consequence is not explained yet." : null,
  }));
}

export class MockPresentationAnalysisProvider implements PresentationAnalysisProvider {
  async analyze({ presentation }: { presentation: Pick<StoredPresentation, "id" | "title" | "durationSeconds" | "transcript" | "audio"> }): Promise<AnalysisResult> {
    const text = presentation.transcript?.trim() || SAMPLE_TRANSCRIPT;
    const segments = sentenceSegments(text);
    return analysisResultSchema.parse({
      version: "1.0",
      mode: "mock",
      disclaimer: "Sample/mock analysis for development only; this is not real AI feedback.",
      generatedAt: new Date().toISOString(),
      summary: {
        overview: "The main idea is promising, but one important concept would benefit from a concrete example before the live presentation.",
        comprehensionScore: 72,
        attentionScore: 78,
        keyMessageScore: 68,
      },
      transcript: { text, segments },
      personas: [
        {
          id: "beginner",
          name: "Beginner listener",
          perspective: "A curious audience member without domain context",
          comprehensionScore: 64,
          attentionScore: 75,
          reaction: "I understand the goal, but I need one plain-language example to connect the steps.",
          blockers: ["The phrase audience-centered feedback is not defined."],
          questions: ["What would this change in a real presentation?"] ,
        },
        {
          id: "peer",
          name: "Peer presenter",
          perspective: "A general audience member familiar with presenting",
          comprehensionScore: 78,
          attentionScore: 82,
          reaction: "The workflow is easy to follow; the recommendation would be stronger with evidence from a sample talk.",
          blockers: ["The transition from analysis to revision is abrupt."],
          questions: ["How do you choose which issue to fix first?"],
        },
        {
          id: "specialist",
          name: "Specialist reviewer",
          perspective: "A domain expert looking for method and limits",
          comprehensionScore: 73,
          attentionScore: 77,
          reaction: "The evaluation perspectives are distinct, but the method behind the comparison needs one boundary or caveat.",
          blockers: ["No limitation is stated for the simulated audience perspectives."],
          questions: ["How should presenters interpret disagreement between personas?"],
        },
      ],
      difficultSections: [
        { segmentId: segments[Math.min(1, segments.length - 1)]!.id, reason: "The concept is named before it is grounded in a concrete example." },
      ],
      missingExplanations: ["Define audience-centered feedback in plain language.", "Show one before-and-after revision."],
      improvements: [
        {
          id: "improvement-1",
          title: "Ground the key message with an example",
          problem: "Listeners can repeat the workflow but cannot yet picture the outcome.",
          action: "Add one short example immediately after introducing audience-centered feedback.",
          example: "For example, if a beginner misses the term latency, replace it with the time a request waits before it starts.",
          sourceSegmentIds: [segments[Math.min(1, segments.length - 1)]!.id],
        },
        {
          id: "improvement-2",
          title: "Explain how to prioritize feedback",
          problem: "The final recommendation does not tell the presenter which issue to fix first.",
          action: "State that repeated comprehension blockers come before stylistic refinements.",
          example: "Start with the concept that both beginner and peer listeners found unclear.",
          sourceSegmentIds: [segments[Math.min(2, segments.length - 1)]!.id],
        },
      ],
    });
  }
}

const providerGlobal = globalThis as typeof globalThis & { __virtualAudienceProvider?: PresentationAnalysisProvider };
export const defaultAnalysisProvider: PresentationAnalysisProvider = providerGlobal.__virtualAudienceProvider ?? new MockPresentationAnalysisProvider();
providerGlobal.__virtualAudienceProvider = defaultAnalysisProvider;

export function setAnalysisProvider(provider: PresentationAnalysisProvider): void {
  providerGlobal.__virtualAudienceProvider = provider;
}

export function getAnalysisProvider(): PresentationAnalysisProvider {
  return providerGlobal.__virtualAudienceProvider ?? defaultAnalysisProvider;
}

const configuredDelay = Number(process.env.ANALYSIS_DELAY_MS ?? "250");
const ANALYSIS_DELAY_MS = Number.isFinite(configuredDelay) && configuredDelay >= 0 ? configuredDelay : 250;

const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function runAnalysis(id: string, provider = getAnalysisProvider()): Promise<void> {
  const record = presentationRepository.get(id);
  if (!record) return;

  try {
    presentationRepository.update(id, { status: "analyzing", stage: "transcribing", progress: 20, error: null });
    await delay(ANALYSIS_DELAY_MS);
    const current = presentationRepository.get(id);
    if (!current) return;
    presentationRepository.update(id, { stage: "evaluating", progress: 60 });
    const result = await provider.analyze({ presentation: current });
    const validated = analysisResultSchema.parse(result);
    presentationRepository.update(id, { status: "complete", stage: "complete", progress: 100, result: validated, error: null });
  } catch (error) {
    const message = error instanceof z.ZodError ? "The analysis provider returned an invalid result." : "Analysis could not be completed.";
    console.error("Presentation analysis failed", error);
    presentationRepository.update(id, { status: "failed", stage: "failed", progress: 100, error: { code: "analysis_failed", message } });
  }
}

export function startAnalysis(id: string): void {
  const record = presentationRepository.get(id);
  if (!record) throw new ApiError(404, "presentation_not_found", `Presentation '${id}' was not found.`);
  if (record.status === "analyzing") throw new ApiError(409, "analysis_in_progress", "Analysis is already in progress.");
  if (record.status === "complete") throw new ApiError(409, "analysis_already_complete", "Analysis has already completed.");
  // A failed analysis is retryable in the MVP. Keep the same presentation and
  // reset its pipeline so the frontend's retry action is a real recovery path.
  presentationRepository.update(id, { status: "analyzing", stage: "queued", progress: 5, error: null });
  void runAnalysis(id);
}
