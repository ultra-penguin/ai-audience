import { createMockClient } from "@/mocks/mock-client";
import type { ApiClient } from "./client";
import { createHttpClient } from "./http-client";

/**
 * Mock-first: the mock client is used unless NEXT_PUBLIC_API_MODE=http and a
 * base URL is configured. Components never call this directly; they go
 * through the hooks in `features/presentation/queries.ts`.
 */
const mode = process.env.NEXT_PUBLIC_API_MODE === "http" ? "http" : "mock";
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const isMockApi = mode === "mock" || !baseUrl;

export const api: ApiClient = isMockApi ? createMockClient() : createHttpClient(baseUrl);

export { ApiError, isApiError, isNotFoundError, safeErrorMessage, shouldRetryQuery } from "./client";
export type { ApiClient } from "./client";
export * from "./types";
