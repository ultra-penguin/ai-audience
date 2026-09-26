import { z } from "zod";
import { AnalysisResultSchema } from "@/shared/api/types";

/**
 * Exhibition demo contract. Each demo is an offline, pre-written example talk:
 * everything the booth shows — transcript, timeline, listener reactions and the
 * final report — lives in one entry, and `result` is a complete AnalysisResult
 * so the existing ResultView renders it without a fork.
 */

export const DEMO_IDS = ["demo-bfs", "demo-ai-ethics", "demo-recycling"] as const;
export const DemoIdSchema = z.enum(DEMO_IDS);
export type DemoId = z.infer<typeof DemoIdSchema>;

/** A verbatim line from the demo transcript that backs a claim. */
export const DemoEvidenceSchema = z.object({
  segmentId: z.string(),
  /** Exact substring of that transcript segment. */
  quote: z.string().min(1),
});
export type DemoEvidence = z.infer<typeof DemoEvidenceSchema>;

export const DemoInsightSchema = z.object({
  /** What all three listeners revealed together, in one sentence. */
  headline: z.string().min(1),
  detail: z.string().min(1),
  sectionId: z.string(),
  evidence: DemoEvidenceSchema,
});
export type DemoInsight = z.infer<typeof DemoInsightSchema>;

export const DemoRecommendationSchema = z.object({
  /** One concrete thing the presenter can do before the next run-through. */
  action: z.string().min(1),
  /** The line as it could be said instead. */
  rewrite: z.string().min(1),
  sectionId: z.string(),
  difficultSectionId: z.string(),
});
export type DemoRecommendation = z.infer<typeof DemoRecommendationSchema>;

export const ExhibitionDemoSchema = z.object({
  id: DemoIdSchema,
  /** Short card label, e.g. "BFS 처음 듣는 사람에게". */
  label: z.string().min(1),
  /** Who the talk was written for. */
  audience: z.string().min(1),
  /** One-line teaser for the demo picker. */
  teaser: z.string().min(1),
  commonInsight: DemoInsightSchema,
  recommendation: DemoRecommendationSchema,
  result: AnalysisResultSchema,
});
export type ExhibitionDemo = z.infer<typeof ExhibitionDemoSchema>;
