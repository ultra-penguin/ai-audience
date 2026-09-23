import { z } from "zod";

export const presentationStatusSchema = z.enum(["uploaded", "analyzing", "complete", "failed"]);
export type PresentationStatus = z.infer<typeof presentationStatusSchema>;

export const analysisStageSchema = z.enum([
  "queued",
  "transcribing",
  "evaluating",
  "finalizing",
  "complete",
  "failed",
]);
export type AnalysisStage = z.infer<typeof analysisStageSchema>;

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

export const personaFeedbackSchema = z.object({
  id: z.enum(["beginner", "peer", "specialist"]),
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
  }),
  transcript: z.object({
    text: z.string().min(1),
    segments: z.array(transcriptSegmentSchema).min(1),
  }),
  personas: z.array(personaFeedbackSchema).min(3).max(5),
  difficultSections: z.array(z.object({
    segmentId: z.string().min(1),
    reason: z.string().min(1),
  })),
  missingExplanations: z.array(z.string().min(1)),
  improvements: z.array(improvementSchema),
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
