import { startAnalysis } from "@/lib/presentations/analysis";
import { errorResponse } from "@/lib/presentations/errors";
import { presentationRepository } from "@/lib/presentations/store";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    startAnalysis(id);
    const presentation = presentationRepository.get(id)!;
    return Response.json(
      {
        presentationId: id,
        stage: presentation.stage === "complete" ? "completed" : "queued",
        progress: presentation.progress / 100,
        updatedAt: presentation.updatedAt,
      },
      { status: 202 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export const runtime = "nodejs";
