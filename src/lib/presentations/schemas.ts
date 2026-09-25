import { z } from "zod";
import { CONFUSION_TYPES, LIKELIHOODS, REACTION_TYPES, SALIENCE_LEVELS } from "./audience-simulation";

export const presentationStatusSchema = z.enum(["uploaded", "analyzing", "complete", "failed"]);
export type PresentationStatus = z.infer<typeof presentationStatusSchema>;

export const analysisStageSchema = z.enum([
  "queued",
  "transcribing",
  "structuring",
  "segmenting",
  "evaluating",
  "cross_check",
  "finalizing",
  "complete",
  "failed",
]);
export type AnalysisStage = z.infer<typeof analysisStageSchema>;

export const analysisPhaseSchema = z.enum(["structure", "section", "persona", "cross_check", "synthesis"]);
export type AnalysisPhase = z.infer<typeof analysisPhaseSchema>;

export const audioMetadataSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});
export type AudioMetadata = z.infer<typeof audioMetadataSchema>;

export const transcriptSegmentSchema = z.object({
  id: z.string().min(1),
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
  text: z.string().min(1),
  difficulty: z.enum(["low", "medium", "high"]),
  issue: z.string().nullable(),
});
export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;

const personaIdSchema = z.enum(["beginner", "peer", "specialist"]);

export const personaFeedbackSchema = z.object({
  id: personaIdSchema,
  name: z.string().min(1),
  perspective: z.string().min(1),
  comprehensionScore: z.number().int().min(0).max(100),
  attentionScore: z.number().int().min(0).max(100),
  reaction: z.string().min(1),
  blockers: z.array(z.string().min(1)),
  questions: z.array(z.string().min(1)),
});
export type PersonaFeedback = z.infer<typeof personaFeedbackSchema>;

export const improvementSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  problem: z.string().min(1),
  action: z.string().min(1),
  example: z.string().min(1),
  sourceSegmentIds: z.array(z.string().min(1)),
});
export type Improvement = z.infer<typeof improvementSchema>;

export const structureSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
  summary: z.string().min(1),
  segmentIds: z.array(z.string().min(1)).min(1),
});
export type StructureSection = z.infer<typeof structureSectionSchema>;

export const sectionAudienceAnalysisSchema = z.object({
  sectionId: z.string().min(1),
  personaId: z.enum(["beginner", "peer", "specialist"]),
  understanding: z.enum(["followed", "partly_lost", "lost"]),
  comprehensionScore: z.number().int().min(0).max(100),
  attentionScore: z.number().int().min(0).max(100),
  reaction: z.string().min(1),
  evidence: z.string().min(1),
  reason: z.string().min(1),
  blockers: z.array(z.string().min(1)).max(6),
  questions: z.array(z.string().min(1)).max(6),
  needsExample: z.boolean(),
  improvement: improvementSchema.omit({ id: true, sourceSegmentIds: true }).nullable(),
  /** Cognitive-simulation detail behind this row (absent for older results). */
  simulation: z.object({
    stateBefore: z.string().min(1),
    newInformation: z.string().min(1),
    stateAfter: z.string().min(1),
    reactionType: z.enum(REACTION_TYPES),
    agreement: z.enum(["agree", "neutral", "disagree", "unclear"]),
    cause: z.enum(CONFUSION_TYPES).nullable(),
    likelihood: z.enum(LIKELIHOODS),
    salience: z.enum(SALIENCE_LEVELS),
    mentalModelGap: z.object({ missingModel: z.string().min(1), approach: z.string().min(1) }).nullable(),
    recovery: z.string().min(1).nullable(),
  }).optional(),
});
export type SectionAudienceAnalysis = z.infer<typeof sectionAudienceAnalysisSchema>;

export const analysisDiscoverySchema = z.object({
  kind: z.enum(["common", "split"]),
  title: z.string().min(1),
  detail: z.string().min(1),
  sectionId: z.string().min(1).optional(),
  personaIds: z.array(z.enum(["beginner", "peer", "specialist"])),
  evidence: z.string().min(1).optional(),
});
export type AnalysisDiscovery = z.infer<typeof analysisDiscoverySchema>;

export const analysisResultSchema = z.object({
  version: z.literal("1.0"),
  mode: z.enum(["mock", "provider"]),
  disclaimer: z.string().min(1),
  generatedAt: z.string().datetime(),
  summary: z.object({
    overview: z.string().min(1),
    comprehensionScore: z.number().int().min(0).max(100),
    attentionScore: z.number().int().min(0).max(100),
    keyMessageScore: z.number().int().min(0).max(100),
    intendedKeyMessage: z.string().min(1).optional(),
    strengths: z.array(z.string().min(1)).max(6).optional(),
  }),
  transcript: z.object({
    text: z.string().min(1),
    segments: z.array(transcriptSegmentSchema).min(1),
  }),
  personas: z.array(personaFeedbackSchema).min(3).max(5),
  difficultSections: z.array(z.object({
    segmentId: z.string().min(1),
    reason: z.string().min(1),
    /** Simulation issues only: the map section, who it affected and why listeners differed. */
    sectionId: z.string().min(1).optional(),
    personaIds: z.array(personaIdSchema).optional(),
    cause: z.enum(CONFUSION_TYPES).nullable().optional(),
    likelihood: z.enum(LIKELIHOODS).optional(),
    salience: z.enum(SALIENCE_LEVELS).optional(),
    pattern: z.string().min(1).optional(),
    evidence: z.string().min(1).optional(),
  })),
  missingExplanations: z.array(z.string().min(1)),
  improvements: z.array(improvementSchema),
  structure: z.object({ sections: z.array(structureSectionSchema).min(1).max(12) }).optional(),
  sectionAnalyses: z.array(sectionAudienceAnalysisSchema).optional(),
  discovery: analysisDiscoverySchema.optional(),
  keyMoments: z.array(z.object({
    kind: z.enum(["first_drop", "interest_peak", "common_question"]),
    sectionId: z.string().min(1),
    startSeconds: z.number().nonnegative(),
    title: z.string().min(1),
    detail: z.string().min(1),
    personaIds: z.array(personaIdSchema),
  })).optional(),
  naturalQuestions: z.array(z.object({
    question: z.string().min(1),
    sectionId: z.string().min(1),
    personaIds: z.array(personaIdSchema).min(1),
  })).optional(),
  /** Structured missing explanations from salient TERM/CONCEPT/CONTEXT/PURPOSE/REFERENCE gaps. */
  explanationGaps: z.array(z.object({
    term: z.string().min(1),
    why: z.string().min(1),
    suggestion: z.string().min(1),
    sectionId: z.string().min(1),
    segmentId: z.string().min(1),
    personaIds: z.array(personaIdSchema),
  })).optional(),
  /** Analogy suggestions that passed the four-condition analogy check. */
  mentalModelGaps: z.array(z.object({
    missingModel: z.string().min(1),
    approach: z.string().min(1),
    sectionId: z.string().min(1),
    segmentId: z.string().min(1),
    personaIds: z.array(personaIdSchema),
  })).optional(),
});
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export const presentationResponseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: presentationStatusSchema,
  stage: analysisStageSchema,
  progress: z.number().int().min(0).max(100),
  durationSeconds: z.number().nonnegative().nullable(),
  transcriptAvailable: z.boolean(),
  audio: audioMetadataSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PresentationResponse = z.infer<typeof presentationResponseSchema>;

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_TRANSCRIPT_CHARS = 100_000;
export const MAX_TITLE_CHARS = 120;

export const SUPPORTED_AUDIO_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
] as const;

export type PresentationInput = {
  title: string;
  durationSeconds: number | null;
  transcript: string | null;
  audio: AudioMetadata;
};
