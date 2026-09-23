import { ApiError, errorResponse, notFound } from "@/lib/presentations/errors";
import { presentationRepository } from "@/lib/presentations/store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const presentation = presentationRepository.get(id);
    if (!presentation) throw notFound(id);
    if (presentation.status === "failed") {
      throw new ApiError(422, "analysis_failed", presentation.error?.message ?? "Analysis failed.");
    }
    if (presentation.status !== "complete" || !presentation.result) {
      throw new ApiError(409, "result_not_ready", "Analysis is not complete; poll the status endpoint first.", { status: presentation.status, stage: presentation.stage });
    }
    return Response.json({ presentationId: id, status: presentation.status, result: presentation.result });
  } catch (error) {
    return errorResponse(error);
  }
}

export const runtime = "nodejs";
