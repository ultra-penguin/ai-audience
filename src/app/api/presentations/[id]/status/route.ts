import { errorResponse, notFound } from "@/lib/presentations/errors";
import { presentationRepository } from "@/lib/presentations/store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const presentation = presentationRepository.get(id);
    if (!presentation) throw notFound(id);
    const stage = {
      queued: "queued",
      transcribing: "transcribing",
      structuring: "structuring",
      segmenting: "segmenting",
      evaluating: "listening",
      cross_check: "cross_check",
      finalizing: "synthesizing",
      complete: "completed",
      failed: "failed",
    } as const;
    return Response.json({
      presentationId: id,
      stage: stage[presentation.stage],
      progress: presentation.progress / 100,
      phase: presentation.phase,
      sectionId: presentation.currentSectionId,
      personaId: presentation.currentPersonaId,
      message: presentation.message,
      pipeline: presentation.pipeline,
      error: presentation.error,
      failedStage: presentation.failedStage ? stage[presentation.failedStage] : undefined,
      updatedAt: presentation.updatedAt,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const runtime = "nodejs";
