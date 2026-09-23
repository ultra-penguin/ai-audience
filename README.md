# AI 가상 관중 발표 리뷰어

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · TanStack Query · Zustand · Zod.
Product brief: `PRODUCT.md`; visual tokens: `DESIGN (4).md`.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing + sample feedback preview |
| `/record` | MediaRecorder recording: start / pause / resume / finish, playback, upload |
| `/analyzing/[id]` | Polls pipeline stages, failure + retry |
| `/result/[id]` | Summary → first fix → persona reactions → difficult sections → missing explanations/examples |

## Frontend API layer

- Contract: `src/shared/api/types.ts` (Zod schemas + endpoint payloads).
- `src/shared/api/index.ts` picks mock by default; `NEXT_PUBLIC_API_MODE=http` plus `NEXT_PUBLIC_API_BASE_URL` switches to HTTP.
- Components use `src/features/presentation/queries.ts` rather than calling endpoints directly.
- Mock results are explicitly labelled as sample data and include demo empty/failure states.

## Backend API

`POST /api/presentations` accepts multipart audio (WebM, Ogg, WAV, MP3, M4A, or MP4; up to 25 MB) and returns an uploaded presentation.

`POST /api/presentations/:id/analyze` starts asynchronous analysis. Poll `GET /api/presentations/:id/status` until complete, then call `GET /api/presentations/:id/result`.

Errors use `{ "error": { "code": "...", "message": "...", "details": ... } }` where details are present.

### Analysis providers

The backend keeps `MockPresentationAnalysisProvider` as the development fallback. It uses the mock provider whenever either `STT_API_KEY` or `LLM_API_KEY` is missing, so local development never needs credentials. With both keys configured, the default `openai-compatible` providers use native `fetch` for Korean-capable speech-to-text and JSON persona analysis; `STT_PROVIDER` and `LLM_PROVIDER` currently accept `openai` or `openai-compatible`. `STT_BASE_URL`, `LLM_BASE_URL`, `STT_MODEL`, `LLM_MODEL`, and `ANALYSIS_TIMEOUT_MS` are optional server-only overrides.

Required server-only variables for real analysis:

- `STT_PROVIDER`, `STT_API_KEY`
- `LLM_PROVIDER`, `LLM_API_KEY`

The upload repository retains audio bytes in memory for STT while exposing only safe audio metadata through API responses. A restart discards bytes and all presentation data, consistent with the MVP storage limitation. Real analysis always uses exactly three fixed perspectives: 비전공 관중, 일반 관중, 전문가 관중; each raw LLM response is Zod-validated and malformed JSON is retried once.

## Storage note

The MVP uses an in-memory presentation repository so the frontend can be integrated without a database or object store. Data and upload metadata are lost on restart and are not suitable for multi-instance production deployment; durable storage is a follow-up.

## State

- Zustand: recording UI state and result persona filter.
- TanStack Query: upload/start mutation, status polling, and result retrieval.
