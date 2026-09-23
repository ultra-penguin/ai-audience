# AI 가상 관중 발표 리뷰어 — Frontend

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · TanStack Query · Zustand · Zod. Product brief: `PM1/PRODUCT.md`; visual tokens: `DESIGN (4).md`.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm typecheck && pnpm lint && pnpm build
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing + sample feedback preview |
| `/record` | MediaRecorder recording: start / pause / resume / finish, playback, upload |
| `/analyzing/[id]` | Polls pipeline stages (queued → transcribing → listening → synthesizing), failure + retry |
| `/result/[id]` | Summary → first fix → persona reactions → difficult sections (timeline, persona filter) → missing explanations / examples |

## API layer (mock-first)

- Contract: `src/shared/api/types.ts` (Zod schemas + endpoint list). Both clients parse every response with it.
- `src/shared/api/index.ts` picks the client: mock by default; `NEXT_PUBLIC_API_MODE=http` + `NEXT_PUBLIC_API_BASE_URL` switches to `http-client.ts`. See `.env.example`.
- Components only use hooks in `src/features/presentation/queries.ts`.
- Mock (`src/mocks/`): status advances by elapsed time (~11s) and survives reloads. Demo ids: `/result/sample`, `/result/demo-empty` (empty state), `/analyzing/demo-failed` (fails once, retry succeeds). Mock results are always labelled as sample data.

## State

- Zustand: recording UI state (`features/recording/recorder-store.ts`), result persona filter (`features/result/result-ui-store.ts`).
- TanStack Query: upload/start mutation, status polling, and the result.
