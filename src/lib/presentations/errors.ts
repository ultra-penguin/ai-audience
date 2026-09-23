import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message, ...(error.details === undefined ? {} : { details: error.details }) } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      { error: { code: "invalid_request", message: "The request did not match the API schema.", details: error.flatten() } },
      { status: 400 },
    );
  }

  console.error("Unexpected API error", error);
  return Response.json(
    { error: { code: "internal_error", message: "Something went wrong while handling the request." } },
    { status: 500 },
  );
}

export function notFound(id: string): ApiError {
  return new ApiError(404, "presentation_not_found", `Presentation '${id}' was not found.`);
}
