# AI Audience

발표하기 전에, 서로 다른 AI 관중에게 먼저 들려보세요. AI Audience는 비전공자·일반 관중·전문가 관점에서 발표의 이해가 막힌 지점과 개선 방향을 보여줍니다.

## Features

- 오프라인 전시 Demo 3종: BFS, AI 윤리, 학교 프로젝트
- Persona 기반 관중 시뮬레이션과 반응 비교
- 발표 구조·Transcript·근거 구간을 연결한 리뷰 리포트
- 브라우저 음성 녹음과 실제 STT/LLM 분석 Pipeline

## Demo

`/exhibition`에서 Demo를 선택하세요. 전시 Demo는 미리 준비된 데이터만 사용하므로 외부 AI API나 Secret 없이도 선택부터 결과까지 실행됩니다.

## Routes

| Route | Purpose |
|---|---|
| `/` | 서비스 소개 및 시작 |
| `/exhibition` | 전시용 Demo 선택 |
| `/exhibition/demo-bfs` | BFS Demo 소개·시뮬레이션 |
| `/exhibition/demo-ai-ethics` | AI 윤리 Demo 소개·시뮬레이션 |
| `/exhibition/demo-recycling` | 학교 프로젝트 Demo 소개·시뮬레이션 |
| `/record` | 실제 발표 녹음 |
| `/analyzing/[id]` | 실제 분석 진행 상태 |
| `/result/[id]` | 실제 분석 결과 리포트 |

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · TanStack Query · Zustand · Zod.

## Local Development

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Environment Variables

```bash
cp .env.example .env.local
```

전시 Demo는 `NEXT_PUBLIC_API_MODE=mock` 기본값으로 동작합니다. 실제 발표 분석을 사용하려면 서버 전용 `GROQ_API_KEY`와 `STT_PROVIDER=groq`, `LLM_PROVIDER=groq`를 배포 환경에 등록하세요. `.env.local`과 Secret은 Git에 커밋하지 않습니다.

`NEXT_PUBLIC_SITE_URL`에는 배포된 HTTPS origin을 넣어 Open Graph/Twitter URL을 절대 경로로 만드세요.

## Architecture

```text
Exhibition Demo → Offline Demo Catalog → Shared Result UI
Real Recording → Upload API → STT → Persona LLM → Validated Result UI
```

실제 발표 데이터와 업로드 파일은 현재 MVP의 in-memory 저장소를 사용하며 서버 재시작 시 사라집니다. 전시 Demo는 이 저장소와 독립적으로 정적 번들 데이터에서 실행됩니다.

## Real Analysis API

실제 녹음 모드는 다음 API 흐름을 사용합니다.

- `POST /api/presentations` — 음성 업로드
- `POST /api/presentations/{id}/analyze` — 분석 시작
- `GET /api/presentations/{id}/status` — 단계별 상태 조회
- `GET /api/presentations/{id}/result` — 검증된 결과 조회

Groq를 사용할 때는 서버 전용 `GROQ_API_KEY`를 설정합니다. STT는 `whisper-large-v3-turbo`, Persona/통합 분석은 `openai/gpt-oss-120b`를 기본값으로 사용하며, 키가 없으면 Mock Provider로 안전하게 동작합니다.

## CI

GitHub Actions는 push와 pull request마다 install → typecheck → lint → test → build를 실행합니다.

## License

프로젝트 정책에 따라 별도 라이선스를 적용하세요.

Product brief: `PRODUCT.md`; visual tokens: `DESIGN (4).md`.
