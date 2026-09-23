import { z } from "zod";

/**
 * Shared API contract between the frontend and the analysis backend.
 *
 * Every response is parsed with these schemas in both the mock and HTTP
 * clients, so swapping the mock layer for real endpoints only requires the
 * backend to honour this file. Endpoints (relative to NEXT_PUBLIC_API_BASE_URL):
 *
 *   POST /presentations                         multipart: audio, durationSec, title?  → CreatePresentationResponse
 *   POST /presentations/{id}/analyze            (no body)                              → AnalysisStatus
 *   GET  /presentations/{id}/status             (status polling)                       → AnalysisStatus
 *   GET  /presentations/{id}/result                                                    → AnalysisResult
 *
 * Errors: non-2xx with body ApiErrorBody.
 */

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export const ApiErrorCodeSchema = z.enum([
  "not_found",
  "presentation_not_found",
  "invalid_audio",
  "unsupported_media_type",
  "invalid_multipart",
  "audio_required",
  "empty_audio",
  "audio_too_large",
  "unsupported_audio_type",
  "invalid_title",
  "invalid_duration",
  "transcript_too_long",
  "audio_too_short",
  "upload_failed",
  "analysis_failed",
  "analysis_in_progress",
  "analysis_already_complete",
  "result_not_ready",
  "invalid_request",
  "internal_error",
  "network_error",
  "unknown",
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorBodySchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;

// ---------------------------------------------------------------------------
// Create presentation (upload)
// ---------------------------------------------------------------------------

export type CreatePresentationRequest = {
  audio: Blob;
  mimeType: string;
  durationSec: number;
  title?: string;
};

export const CreatePresentationResponseSchema = z.object({
  presentationId: z.string().min(1),
  createdAt: z.string(),
});
export type CreatePresentationResponse = z.infer<typeof CreatePresentationResponseSchema>;

// ---------------------------------------------------------------------------
// Analysis status
// ---------------------------------------------------------------------------

/** Pipeline stages in the order the backend runs them. */
export const AnalysisStageSchema = z.enum([
  "queued",
  "transcribing",
  "listening", // personas "listen" to the transcript
  "synthesizing", // difficult points, reasons and repairs are assembled
  "completed",
  "failed",
]);
export type AnalysisStage = z.infer<typeof AnalysisStageSchema>;

export const AnalysisStatusSchema = z.object({
  presentationId: z.string(),
  stage: AnalysisStageSchema,
  /** Optional 0–1 progress within the whole pipeline; UI must not depend on it. */
  progress: z.number().min(0).max(1).optional(),
  error: ApiErrorBodySchema.optional(),
  /** Stage that was running when the pipeline failed (only when stage === "failed"). */
  failedStage: AnalysisStageSchema.optional(),
  updatedAt: z.string(),
});
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;

// ---------------------------------------------------------------------------
// Analysis result
// ---------------------------------------------------------------------------

/** Colour/badge key. Each persona is a distinct evaluation perspective. */
export const PersonaKindSchema = z.enum(["beginner", "peer", "expert", "decision_maker"]);
export type PersonaKind = z.infer<typeof PersonaKindSchema>;

export const PersonaSchema = z.object({
  id: z.string(),
  kind: PersonaKindSchema,
  name: z.string(), // e.g. "비전공 대학생"
  description: z.string(), // who they are / what they already know
  listensFor: z.string(), // what this audience cares about
});
export type Persona = z.infer<typeof PersonaSchema>;

/** Qualitative, not a score: how well this persona followed the talk. */
export const UnderstandingSchema = z.enum(["followed", "partly_lost", "lost"]);
export type Understanding = z.infer<typeof UnderstandingSchema>;

export const PersonaFeedbackSchema = z.object({
  personaId: z.string(),
  understanding: UnderstandingSchema,
  receivedKeyMessage: z.boolean(),
  /** First-person reaction, written as what the listener would say. */
  reaction: z.string(),
  whatLanded: z.array(z.string()),
  whereLost: z.array(z.string()),
  difficultSectionIds: z.array(z.string()),
});
export type PersonaFeedback = z.infer<typeof PersonaFeedbackSchema>;

export const DifficultyCategorySchema = z.enum([
  "terminology",
  "missing_context",
  "pace",
  "structure",
  "abstract",
  "key_message",
]);
export type DifficultyCategory = z.infer<typeof DifficultyCategorySchema>;

export const SectionReactionSchema = z.object({
  personaId: z.string(),
  reaction: z.string(),
});

export const DifficultSectionSchema = z.object({
  id: z.string(),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  /** Transcript excerpt for this section. */
  transcript: z.string(),
  /** Exact substring of `transcript` where the audience got stuck. */
  highlight: z.string().optional(),
  category: DifficultyCategorySchema,
  severity: z.enum(["high", "medium", "low"]),
  /** Audience perspective → difficult point → reason → improvement. */
  reactions: z.array(SectionReactionSchema).min(1),
  reason: z.string(),
  improvement: z.object({
    suggestion: z.string(),
    rewrite: z.string().optional(),
  }),
});
export type DifficultSection = z.infer<typeof DifficultSectionSchema>;

export const MissingExplanationSchema = z.object({
  id: z.string(),
  term: z.string(),
  why: z.string(),
  suggestedExplanation: z.string(),
  personaIds: z.array(z.string()),
  sectionId: z.string().optional(),
});
export type MissingExplanation = z.infer<typeof MissingExplanationSchema>;

export const ExampleSuggestionSchema = z.object({
  id: z.string(),
  concept: z.string(),
  example: z.string(),
  personaIds: z.array(z.string()),
  sectionId: z.string().optional(),
});
export type ExampleSuggestion = z.infer<typeof ExampleSuggestionSchema>;

export const ResultSummarySchema = z.object({
  /** One calm sentence describing how the audience received the talk. */
  headline: z.string(),
  intendedKeyMessage: z.string(),
  /** Id of the difficult section the presenter should fix first. */
  priorityFixSectionId: z.string().optional(),
  strengths: z.array(z.string()),
});
export type ResultSummary = z.infer<typeof ResultSummarySchema>;

export const AnalysisResultSchema = z.object({
  presentationId: z.string(),
  title: z.string(),
  durationSec: z.number().min(0),
  analyzedAt: z.string(),
  /** True when the content is illustrative sample data, not the user's talk. */
  isSample: z.boolean(),
  summary: ResultSummarySchema,
  personas: z.array(PersonaSchema).min(1).max(5),
  personaFeedback: z.array(PersonaFeedbackSchema),
  difficultSections: z.array(DifficultSectionSchema),
  missingExplanations: z.array(MissingExplanationSchema),
  exampleSuggestions: z.array(ExampleSuggestionSchema),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
