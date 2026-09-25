import {
  AnalysisResultSchema,
  type AnalysisResult,
  type ConfusionCause,
  type DifficultyCategory,
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

/** Legacy category chip for older UI paths; the simulation's own cause is sent alongside. */
const CAUSE_CATEGORY: Record<ConfusionCause, DifficultyCategory> = {
  TERM_CONFUSION: "terminology",
  CONCEPT_CONFUSION: "abstract",
  CONNECTION_CONFUSION: "structure",
  PURPOSE_CONFUSION: "key_message",
  EXAMPLE_GAP: "abstract",
  CONTEXT_GAP: "missing_context",
  LOGIC_GAP: "structure",
  REFERENCE_GAP: "missing_context",
};

const SALIENCE_SEVERITY = { CRITICAL: "high", SIGNIFICANT: "medium", LOW: "low", IGNORE: "low" } as const;

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
  const hasSectionEvidence = result.mode === "mock" || Boolean(result.sectionAnalyses?.length);
  const segmentById = new Map(result.transcript.segments.map((segment) => [segment.id, segment]));
  const owningSectionFor = (segmentId: string) => result.structure?.sections.find((candidate) => candidate.segmentIds.includes(segmentId));
  /** Personas who got stuck in (or asked for an example in) a presentation-map section. */
  const focusAnalysesFor = (sectionId: string | undefined) =>
    result.sectionAnalyses?.filter((analysis) => analysis.sectionId === sectionId && (analysis.understanding !== "followed" || analysis.needsExample)) ?? [];

  const difficultSections = result.difficultSections.map((section, index) => {
    const segment = sectionBySegmentId.get(section.segmentId) ?? result.transcript.segments[index] ?? result.transcript.segments[0]!;
    const matchingImprovement = improvementBySegmentId.get(section.segmentId);
    const owningSection = owningSectionFor(section.segmentId);
    const focus = section.personaIds
      ? result.sectionAnalyses?.filter((analysis) => analysis.sectionId === owningSection?.id && section.personaIds!.includes(analysis.personaId)) ?? []
      : focusAnalysesFor(owningSection?.id);

    if (owningSection && focus.length > 0) {
      // Section-level evidence: span the whole map section and quote only the listeners who actually stopped there.
      const transcript = owningSection.segmentIds.map((id) => segmentById.get(id)?.text.trim() ?? "").filter(Boolean).join(" ");
      const highlight = [section.evidence?.trim(), ...focus.map((analysis) => analysis.evidence.trim())].find((evidence) => evidence && transcript.includes(evidence));
      const severity = section.salience
        ? SALIENCE_SEVERITY[section.salience]
        : focus.some((analysis) => analysis.understanding === "lost")
          ? "high"
          : focus.some((analysis) => analysis.understanding === "partly_lost")
            ? "medium"
            : "low";
      return {
        id: section.segmentId,
        startSec: owningSection.startSeconds,
        endSec: owningSection.endSeconds,
        transcript: transcript || segment.text,
        ...(highlight ? { highlight } : {}),
        severity,
        reactions: focus.map((analysis) => ({ personaId: `p-${analysis.personaId}`, reaction: analysis.reaction })),
        reason: section.reason,
        ...(section.cause ? { cause: section.cause, category: CAUSE_CATEGORY[section.cause] } : {}),
        ...(section.likelihood ? { likelihood: section.likelihood } : {}),
        ...(section.pattern ? { pattern: section.pattern } : {}),
        improvement: {
          suggestion: matchingImprovement?.action ?? "이 부분을 한 문장으로 먼저 설명해 보세요.",
          rewrite: matchingImprovement?.example,
        },
      };
    }

    const reactions = hasSectionEvidence
      ? result.sectionAnalyses?.filter((analysis) => analysis.sectionId === owningSection?.id).map((analysis) => ({
          personaId: `p-${analysis.personaId}`,
          reaction: analysis.reaction,
        })) ?? result.personas.filter((persona) => persona.blockers.length > 0).map((persona) => ({
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
    // Keep the legacy field for the shared contract, but never copy the
    // presentation-wide key-message score into every listener row. The UI
    // uses each persona's own comprehension state instead.
    receivedKeyMessage: understandingFor(persona.comprehensionScore) === "followed",
    reaction: persona.reaction,
    whatLanded: [],
    whereLost: persona.blockers,
    difficultSectionIds: result.sectionAnalyses?.length
      ? result.difficultSections
          .filter((section) => section.personaIds ? section.personaIds.includes(persona.id) : focusAnalysesFor(owningSectionFor(section.segmentId)?.id).some((analysis) => analysis.personaId === persona.id))
          .map((section) => section.segmentId)
      : hasSectionEvidence
        ? result.difficultSections.map((section) => section.segmentId)
        : [],
  }));

  const missingExplanations = result.explanationGaps
    ? result.explanationGaps.map((gap, index) => ({
        id: `missing-${index + 1}`,
        term: gap.term,
        why: gap.why,
        suggestedExplanation: gap.suggestion,
        personaIds: gap.personaIds.map((personaId) => `p-${personaId}`),
        sectionId: gap.segmentId,
      }))
    : result.missingExplanations.map((text, index) => ({
    id: `missing-${index + 1}`,
    term: text,
    why: "관중이 이 개념에서 이해를 멈출 수 있어요.",
    suggestedExplanation: text,
    personaIds: result.sectionAnalyses?.filter((analysis) => analysis.blockers.includes(text)).map((analysis) => `p-${analysis.personaId}`) ?? personas.map((persona) => persona.id),
  }));

  // Simulation results only suggest an analogy where a listener lacked the mental model; never for every concept.
  const exampleSuggestions = result.mentalModelGaps
    ? result.mentalModelGaps.map((gap, index) => ({
        id: `mental-model-${index + 1}`,
        concept: gap.missingModel,
        example: gap.approach,
        personaIds: gap.personaIds.map((personaId) => `p-${personaId}`),
        sectionId: gap.segmentId,
      }))
    : result.improvements.map((improvement) => {
    const sectionId = result.structure?.sections.find((section) => section.segmentIds.includes(improvement.sourceSegmentIds[0] ?? ""))?.id;
    const personaIds = result.sectionAnalyses?.filter((analysis) => analysis.sectionId === sectionId).map((analysis) => `p-${analysis.personaId}`);
    return {
      id: improvement.id,
      concept: improvement.title,
      example: improvement.example,
      personaIds: personaIds?.length ? personaIds : personas.map((persona) => persona.id),
      sectionId: improvement.sourceSegmentIds[0],
    };
  });

  const mapSections = result.structure?.sections.map((section) => {
    const difficultSectionIds = result.difficultSections
      .filter((difficult) => section.segmentIds.includes(difficult.segmentId))
      .map((difficult) => difficult.segmentId);
    return {
      id: section.id,
      title: section.title,
      startSec: section.startSeconds,
      endSec: section.endSeconds,
      summary: section.summary,
      segmentIds: section.segmentIds,
      difficultSectionIds,
    };
  });

  const audienceHeatmap = result.sectionAnalyses
    ? {
        cells: result.sectionAnalyses.map((analysis) => ({
          sectionId: analysis.sectionId,
          personaId: `p-${analysis.personaId}`,
          reception: analysis.understanding === "followed" ? "clear" : analysis.understanding === "lost" ? "lost" : "partial",
          evidence: analysis.evidence,
        })),
      }
    : undefined;

  const difficultSectionId = result.discovery?.sectionId
    ? result.difficultSections.find((difficult) => result.structure?.sections.find((section) => section.id === result.discovery?.sectionId)?.segmentIds.includes(difficult.segmentId))?.segmentId
    : undefined;

  const difficultIdForSection = (sectionId: string) =>
    result.difficultSections.find((difficult) => result.structure?.sections.find((section) => section.id === sectionId)?.segmentIds.includes(difficult.segmentId))?.segmentId;
  const sectionStart = (sectionId: string) => result.structure?.sections.find((section) => section.id === sectionId)?.startSeconds;

  return AnalysisResultSchema.parse({
    presentationId: record.id,
    title: record.title,
    durationSec: record.durationSeconds ?? 0,
    analyzedAt: result.generatedAt,
    isSample: result.mode === "mock",
    summary: {
      headline: result.summary.overview,
      intendedKeyMessage: result.summary.intendedKeyMessage ?? result.summary.overview,
      priorityFixSectionId: difficultSections[0]?.id,
      strengths: result.summary.strengths ?? [],
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
    presentationMap: mapSections ? { sections: mapSections } : undefined,
    audienceHeatmap,
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
    discovery: result.discovery
      ? {
          headline: result.discovery.title,
          detail: result.discovery.detail,
          sectionId: result.discovery.sectionId,
          difficultSectionId,
          personaIds: result.discovery.personaIds.map((personaId) => `p-${personaId}`),
        }
      : undefined,
    keyMoments: result.keyMoments?.map((moment, index) => ({
      id: `moment-${index + 1}`,
      kind: moment.kind,
      startSec: moment.startSeconds,
      title: moment.title,
      detail: moment.detail,
      sectionId: moment.sectionId,
      difficultSectionId: difficultIdForSection(moment.sectionId),
      personaIds: moment.personaIds.map((personaId) => `p-${personaId}`),
    })),
    naturalQuestions: result.naturalQuestions?.map((question, index) => ({
      id: `question-${index + 1}`,
      question: question.question,
      personaIds: question.personaIds.map((personaId) => `p-${personaId}`),
      sectionId: question.sectionId,
      startSec: sectionStart(question.sectionId),
    })),
  });
}
