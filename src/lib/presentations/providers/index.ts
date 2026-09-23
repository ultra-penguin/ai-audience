import {
  OpenAICompatibleLanguageModelProvider,
  OpenAICompatibleSpeechToTextProvider,
} from "./openai-compatible";
import { ProviderError, type JsonLanguageModelProvider, type SpeechToTextProvider } from "./types";

export { ProviderError } from "./types";
export { OpenAICompatibleLanguageModelProvider, OpenAICompatibleSpeechToTextProvider } from "./openai-compatible";
export type {
  JsonLanguageModelProvider,
  JsonLanguageModelRequest,
  ProviderErrorCode,
  SpeechSegment,
  SpeechToTextProvider,
  SpeechToTextResult,
} from "./types";

export type ConfiguredProviders = {
  speechToText: SpeechToTextProvider;
  languageModel: JsonLanguageModelProvider;
};

export type ProviderEnv = {
  [key: string]: string | undefined;
  STT_PROVIDER?: string;
  STT_API_KEY?: string;
  LLM_PROVIDER?: string;
  LLM_API_KEY?: string;
  GROQ_API_KEY?: string;
  STT_BASE_URL?: string;
  LLM_BASE_URL?: string;
  STT_MODEL?: string;
  STT_LANGUAGE?: string;
  LLM_MODEL?: string;
  LLM_REASONING_EFFORT?: string;
  ANALYSIS_TIMEOUT_MS?: string;
};

function configuredName(value: string | undefined, fallback: string): string {
  return (value?.trim().toLowerCase() || fallback).replace(/_/g, "-");
}

function timeoutFromEnv(value: string | undefined): number {
  const parsed = Number(value ?? "30000");
  return Number.isFinite(parsed) && parsed >= 1000 && parsed <= 120_000 ? parsed : 30_000;
}

function ensureSupportedProvider(kind: "STT_PROVIDER" | "LLM_PROVIDER", value: string): void {
  if (!["groq", "openai", "openai-compatible"].includes(value)) {
    throw new ProviderError("analysis_provider_error", `Unsupported ${kind} configuration.`);
  }
}

/** Selects server-side providers. Missing either key intentionally means mock mode. */
export function createConfiguredProviders(env: ProviderEnv = process.env): ConfiguredProviders | null {
  const sttProvider = configuredName(env.STT_PROVIDER, "groq");
  const llmProvider = configuredName(env.LLM_PROVIDER, "groq");
  ensureSupportedProvider("STT_PROVIDER", sttProvider);
  ensureSupportedProvider("LLM_PROVIDER", llmProvider);

  const groqKey = env.GROQ_API_KEY?.trim();
  const sttKey = env.STT_API_KEY?.trim() || (sttProvider === "groq" ? groqKey : undefined);
  const llmKey = env.LLM_API_KEY?.trim() || (llmProvider === "groq" ? groqKey : undefined);
  if (!sttKey || !llmKey) return null;

  const timeoutMs = timeoutFromEnv(env.ANALYSIS_TIMEOUT_MS);
  return {
    speechToText: new OpenAICompatibleSpeechToTextProvider(sttKey, {
      endpoint: env.STT_BASE_URL?.trim() || (sttProvider === "groq" ? "https://api.groq.com/openai/v1/audio/transcriptions" : undefined),
      model: env.STT_MODEL?.trim() || (sttProvider === "groq" ? "whisper-large-v3-turbo" : undefined),
      language: env.STT_LANGUAGE?.trim() || (sttProvider === "groq" ? "ko" : undefined),
      timeoutMs,
    }),
    languageModel: new OpenAICompatibleLanguageModelProvider(llmKey, {
      endpoint: env.LLM_BASE_URL?.trim() || (llmProvider === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : undefined),
      model: env.LLM_MODEL?.trim() || (llmProvider === "groq" ? "openai/gpt-oss-120b" : undefined),
      reasoningEffort: env.LLM_REASONING_EFFORT?.trim() || (llmProvider === "groq" ? "low" : undefined),
      timeoutMs,
    }),
  };
}
