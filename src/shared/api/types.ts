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
 * Errors: non-2xx with body `{ error: ApiErrorBody }` (a bare ApiErrorBody is
 * also accepted). Unknown codes are normalised to "unknown" by the client.
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
  "analysis_timeout",
  "analysis_rate_limited",
  "analysis_provider_error",
  "analysis_empty_transcript",
  "analysis_invalid_output",
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
  "structuring",
  "segmenting",
  "listening", // personas "listen" to the transcript
  "cross_check",
  "synthesizing", // difficult points, reasons and repairs are assembled
  "completed",
  "failed",
]);
export type AnalysisStage = z.infer<typeof AnalysisStageSchema>;

/**
 * Phase 4 analysis steps inside "listening"/"synthesizing". Reported by the
 * backend in `AnalysisStatus.pipeline`; the UI never infers them from time.
 *   structure   the talk is split into a presentation map of sections
 *   section     each section's role/claim is read
 *   persona     each audience persona listens section by section
 *   cross_check personas are compared and the result is synthesised
 */
export const AnalysisStepSchema = z.enum(["structure", "section", "persona", "cross_check"]);
export type AnalysisStep = z.infer<typeof AnalysisStepSchema>;

export const StepStateSchema = z.enum(["pending", "running", "done", "failed", "skipped"]);
export type StepState = z.infer<typeof StepStateSchema>;

export const MapSectionSchema = z.object({
  id: z.string(),
  /** Short Korean label, e.g. "문제 제기". */
  title: z.string(),
  startSec: z.number().min(0).optional(),
  endSec: z.number().min(0).optional(),
  /** One-sentence gist of what this part of the talk says. */
  summary: z.string().optional(),
  /** Transcript segment ids covered by this section (for anchors into the script). */
  segmentIds: z.array(z.string()).optional(),
  /** Difficult sections (DifficultSection.id) that fall inside this section. */
  difficultSectionIds: z.array(z.string()).optional(),
});
export type MapSection = z.infer<typeof MapSectionSchema>;

export const PipelineInsightSchema = z.object({
  id: z.string(),
  text: z.string(),
  sectionId: z.string().optional(),
  personaId: z.string().optional(),
});
export type PipelineInsight = z.infer<typeof PipelineInsightSchema>;

/** Truthful per-step metadata. Everything is optional; absent means "not reported". */
export const AnalysisPipelineSchema = z.object({
  steps: z.array(z.object({ step: AnalysisStepSchema, state: StepStateSchema })).optional(),
  /** Sections found by the structure step (may arrive before any listening starts). */
  sections: z.array(MapSectionSchema).optional(),
  personas: z.array(z.object({ id: z.string(), kind: z.lazy(() => PersonaKindSchema), name: z.string() })).optional(),
  currentSectionId: z.string().nullish(),
  currentPersonaId: z.string().nullish(),
  /** Persona × section progress, one entry per pair the backend has scheduled. */
  cells: z
    .array(z.object({ sectionId: z.string(), personaId: z.string(), state: StepStateSchema }))
    .optional(),
  /** Short Korean explanation of what the backend is doing right now. */
  message: z.string().nullish(),
  /** Concise findings so far, oldest first. */
  insights: z.array(PipelineInsightSchema).optional(),
});
export type AnalysisPipeline = z.infer<typeof AnalysisPipelineSchema>;

export const AnalysisStatusSchema = z.object({
  presentationId: z.string(),
  stage: AnalysisStageSchema,
  /** Optional 0–1 progress within the whole pipeline; UI must not depend on it. */
  progress: z.number().min(0).max(1).optional(),
  /** The backend may send `null` or a provider-specific code; the UI only shows a safe message for it. */
  error: z.object({ code: z.string(), message: z.string() }).nullish(),
  /** Stage that was running when the pipeline failed (only when stage === "failed"). */
  failedStage: AnalysisStageSchema.nullish(),
  phase: z.enum(["structure", "section", "persona", "cross_check", "synthesis"]).nullish(),
  sectionId: z.string().nullish(),
  personaId: z.enum(["beginner", "peer", "specialist"]).nullish(),
  message: z.string().nullish(),
  /** Optional Phase 4 detail. Malformed detail is dropped rather than failing the poll. */
  pipeline: AnalysisPipelineSchema.nullish().catch(null),
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
  /** Optional when the provider only identified a difficult passage, not its category or severity. */
  category: DifficultyCategorySchema.optional(),
  severity: z.enum(["high", "medium", "low"]).optional(),
  /** Audience perspective → difficult point → reason → improvement. */
  reactions: z.array(SectionReactionSchema),
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

export const TranscriptSegmentSchema = z.object({
  id: z.string(),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  text: z.string(),
});
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

/** Full speech-to-text output. Optional so older payloads and samples stay valid. */
export const TranscriptSchema = z.object({
  text: z.string(),
  segments: z.array(TranscriptSegmentSchema),
});
export type Transcript = z.infer<typeof TranscriptSchema>;

/** How one persona received one presentation-map section. */
export const SectionAudienceAnalysisSchema = z.object({
  sectionId: z.string(),
  personaId: z.string(),
  understanding: UnderstandingSchema,
  comprehensionScore: z.number().int().min(0).max(100),
  attentionScore: z.number().int().min(0).max(100),
  reaction: z.string(),
  evidence: z.string(),
  reason: z.string(),
  blockers: z.array(z.string()),
  questions: z.array(z.string()),
  needsExample: z.boolean(),
});
export type SectionAudienceAnalysis = z.infer<typeof SectionAudienceAnalysisSchema>;

export const ReceptionSchema = z.enum(["clear", "partial", "lost"]);
export type Reception = z.infer<typeof ReceptionSchema>;

export const HeatmapCellSchema = z.object({
  sectionId: z.string(),
  personaId: z.string(),
  reception: ReceptionSchema,
  /** The listener's own words or the transcript evidence behind the rating. */
  evidence: z.string().optional(),
});
export type HeatmapCell = z.infer<typeof HeatmapCellSchema>;

export const DiscoverySchema = z.object({
  /** The single most important thing the audience revealed. */
  headline: z.string(),
  detail: z.string().optional(),
  /** Presentation-map section id and/or difficult section id it points at. */
  sectionId: z.string().optional(),
  difficultSectionId: z.string().optional(),
  personaIds: z.array(z.string()).optional(),
});
export type Discovery = z.infer<typeof DiscoverySchema>;

/** Backward-compatible internal discovery shape used before the result story contract. */
export const AnalysisDiscoverySchema = z.object({
  kind: z.enum(["common", "split"]),
  title: z.string(),
  detail: z.string(),
  sectionId: z.string().optional(),
  personaIds: z.array(z.string()),
  evidence: z.string().optional(),
});
export type AnalysisDiscovery = z.infer<typeof AnalysisDiscoverySchema>;

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
  transcript: TranscriptSchema.optional(),
  /** Phase 4, optional: talk structure in speaking order. */
  presentationMap: z.object({ sections: z.array(MapSectionSchema) }).optional().catch(undefined),
  /** Phase 4, optional: persona × section reception with evidence. */
  audienceHeatmap: z.object({ cells: z.array(HeatmapCellSchema) }).optional().catch(undefined),
  /** Legacy detailed rows retained for provider compatibility and diagnostics. */
  sectionAnalyses: z.array(SectionAudienceAnalysisSchema).optional(),
  /** Phase 4, optional: the biggest discovery, written by the cross-check step. */
  discovery: DiscoverySchema.optional().catch(undefined),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
