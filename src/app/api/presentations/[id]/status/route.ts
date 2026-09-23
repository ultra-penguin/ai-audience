import { errorResponse, notFound } from "@/lib/presentations/errors";
import { presentationRepository } from "@/lib/presentations/store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const presentation = presentationRepository.get(id);
    if (!presentation) throw notFound(id);
    return Response.json({
      presentationId: id,
      status: presentation.status,
      stage: presentation.stage,
      progress: presentation.progress,
      error: presentation.error,
      updatedAt: presentation.updatedAt,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const runtime = "nodejs";
