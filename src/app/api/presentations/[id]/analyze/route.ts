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
        status: presentation.status,
        stage: presentation.stage,
        progress: presentation.progress,
        message: "Analysis started. Poll the status endpoint until it is complete.",
      },
      { status: 202 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export const runtime = "nodejs";
