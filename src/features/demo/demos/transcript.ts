import type { Transcript, TranscriptSegment } from "@/shared/api/types";

/** Builds the full transcript from its segments so `text` can never drift from them. */
export function transcriptOf(segments: TranscriptSegment[]): Transcript {
  return { text: segments.map((s) => s.text).join(" "), segments };
}
