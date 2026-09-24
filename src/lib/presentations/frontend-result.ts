import {
  AnalysisResultSchema,
  type AnalysisResult,
  type PersonaKind,
} from "../../shared/api/types";
import type { AnalysisResult as BackendAnalysisResult, PersonaFeedback as BackendPersonaFeedback } from "./schemas";
import type { StoredPresentation } from "./store";

const PERSONA_KIND: Record<BackendPersonaFeedback["id"], PersonaKind> = {
  beginner: "beginner",
  peer: "peer",
  specialist: "expert",
};

const STAGE_CATEGORY = {
  low: "structure",
  medium: "missing_context",
  high: "terminology",
} as const;

function understandingFor(score: number): "followed" | "partly_lost" | "lost" {
  if (score >= 75) return "followed";
  if (score >= 55) return "partly_lost";
  return "lost";
}

/**
 * The backend keeps provider-oriented data internally. This is the single
 * boundary that turns it into the shared UI contract consumed by the mock and
 * HTTP clients, so route payloads cannot drift from frontend Zod validation.
 */
export function toFrontendAnalysisResult(
  record: StoredPresentation,
  result: BackendAnalysisResult,
): AnalysisResult {
  const personas = result.personas.map((persona) => ({
    id: `p-${persona.id}`,
    kind: PERSONA_KIND[persona.id],
    name: persona.name,
    description: persona.perspective,
    listensFor: persona.blockers[0] ?? "발표의 핵심 메시지와 흐름이 이해되는지",
  }));

  const sectionBySegmentId = new Map(result.transcript.segments.map((segment) => [segment.id, segment]));
  const improvementBySegmentId = new Map(
    result.improvements.flatMap((improvement) => improvement.sourceSegmentIds.map((segmentId) => [segmentId, improvement] as const)),
  );
  const hasSectionEvidence = result.mode === "mock";

  const difficultSections = result.difficultSections.map((section, index) => {
    const segment = sectionBySegmentId.get(section.segmentId) ?? result.transcript.segments[index] ?? result.transcript.segments[0]!;
    const matchingImprovement = improvementBySegmentId.get(section.segmentId);
    const reactions = hasSectionEvidence
      ? result.personas
          .filter((persona) => persona.blockers.length > 0)
          .map((persona) => ({
            personaId: `p-${persona.id}`,
            reaction: persona.blockers[0] ?? persona.reaction,
          }))
      : [];

    return {
      id: section.segmentId,
      startSec: segment.startSeconds,
      endSec: segment.endSeconds,
      transcript: segment.text,
      ...(hasSectionEvidence ? { category: STAGE_CATEGORY[segment.difficulty], severity: segment.difficulty } : {}),
      reactions,
      reason: section.reason,
      improvement: {
        suggestion: matchingImprovement?.action ?? "이 부분을 한 문장으로 먼저 설명해 보세요.",
        rewrite: matchingImprovement?.example,
      },
    };
  });

  const personaFeedback = result.personas.map((persona) => ({
    personaId: `p-${persona.id}`,
    understanding: understandingFor(persona.comprehensionScore),
    receivedKeyMessage: result.summary.keyMessageScore >= 60,
    reaction: persona.reaction,
    whatLanded: [],
    whereLost: persona.blockers,
    difficultSectionIds: hasSectionEvidence ? result.difficultSections.map((section) => section.segmentId) : [],
  }));

  const missingExplanations = result.missingExplanations.map((text, index) => ({
    id: `missing-${index + 1}`,
    term: text,
    why: "관중이 이 개념에서 이해를 멈출 수 있어요.",
    suggestedExplanation: text,
    personaIds: personas.map((persona) => persona.id),
  }));

  const exampleSuggestions = result.improvements.map((improvement) => ({
    id: improvement.id,
    concept: improvement.title,
    example: improvement.example,
    personaIds: personas.map((persona) => persona.id),
    sectionId: improvement.sourceSegmentIds[0],
  }));

  return AnalysisResultSchema.parse({
    presentationId: record.id,
    title: record.title,
    durationSec: record.durationSeconds ?? 0,
    analyzedAt: result.generatedAt,
    isSample: result.mode === "mock",
    summary: {
      headline: result.summary.overview,
      intendedKeyMessage: result.summary.overview,
      priorityFixSectionId: difficultSections[0]?.id,
      strengths: [],
    },
    personas,
    personaFeedback,
    difficultSections,
    missingExplanations,
    exampleSuggestions,
    transcript: {
      text: result.transcript.text,
      segments: result.transcript.segments.map((segment) => ({
        id: segment.id,
        startSec: segment.startSeconds,
        endSec: segment.endSeconds,
        text: segment.text,
      })),
    },
    presentationMap: result.structure?.sections.map((section) => ({
      id: section.id,
      title: section.title,
      startSec: section.startSeconds,
      endSec: section.endSeconds,
      summary: section.summary,
      segmentIds: section.segmentIds,
    })),
    sectionAnalyses: result.sectionAnalyses?.map((analysis) => ({
      sectionId: analysis.sectionId,
      personaId: `p-${analysis.personaId}`,
      understanding: analysis.understanding,
      comprehensionScore: analysis.comprehensionScore,
      attentionScore: analysis.attentionScore,
      reaction: analysis.reaction,
      evidence: analysis.evidence,
      reason: analysis.reason,
      blockers: analysis.blockers,
      questions: analysis.questions,
      needsExample: analysis.needsExample,
    })),
    discovery: result.discovery,
  });
}
