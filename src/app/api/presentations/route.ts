import { ApiError, errorResponse } from "@/lib/presentations/errors";
import { presentationRepository, toPresentationResponse } from "@/lib/presentations/store";
import {
  MAX_AUDIO_BYTES,
  MAX_TITLE_CHARS,
  MAX_TRANSCRIPT_CHARS,
  SUPPORTED_AUDIO_TYPES,
  type PresentationInput,
} from "@/lib/presentations/schemas";

function asString(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" ? value : null;
}

function parseOptionalDuration(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration < 0 || duration > 2 * 60 * 60) {
    throw new ApiError(400, "invalid_duration", "durationSeconds must be between 0 and 7200 seconds.");
  }
  return duration;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      throw new ApiError(415, "unsupported_media_type", "Create a presentation with multipart/form-data and an audio field.");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, "invalid_multipart", "The multipart request could not be parsed.");
    }

    const audioEntry = form.get("audio") ?? form.get("file");
    if (!(audioEntry instanceof File)) {
      throw new ApiError(400, "audio_required", "An audio file is required in the 'audio' field.");
    }
    if (audioEntry.size <= 0) throw new ApiError(400, "empty_audio", "The audio file is empty.");
    if (audioEntry.size > MAX_AUDIO_BYTES) {
      throw new ApiError(413, "audio_too_large", `Audio files must be ${MAX_AUDIO_BYTES / 1024 / 1024} MB or smaller.`);
    }
    const mimeType = audioEntry.type.toLowerCase().split(";", 1)[0]!;
    if (!(SUPPORTED_AUDIO_TYPES as readonly string[]).includes(mimeType)) {
      throw new ApiError(415, "unsupported_audio_type", `Unsupported audio type '${audioEntry.type || "unknown"}'.`, { supported: SUPPORTED_AUDIO_TYPES });
    }

    const title = (asString(form.get("title")) ?? "Untitled presentation").trim();
    if (!title || title.length > MAX_TITLE_CHARS) {
      throw new ApiError(400, "invalid_title", `title must be between 1 and ${MAX_TITLE_CHARS} characters.`);
    }
    const transcript = asString(form.get("transcript"))?.trim() || null;
    if (transcript && transcript.length > MAX_TRANSCRIPT_CHARS) {
      throw new ApiError(400, "transcript_too_long", `transcript must be ${MAX_TRANSCRIPT_CHARS} characters or shorter.`);
    }

    const input: PresentationInput = {
      title,
      durationSeconds: parseOptionalDuration(asString(form.get("durationSeconds"))),
      transcript,
      audio: { filename: audioEntry.name || "recording", mimeType, sizeBytes: audioEntry.size },
    };
    const record = presentationRepository.create(input);
    const presentation = toPresentationResponse(record);
    return Response.json({ presentationId: presentation.id, createdAt: presentation.createdAt, presentation }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export const runtime = "nodejs";
