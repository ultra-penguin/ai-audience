# AI Audience

발표하기 전에, 서로 다른 AI 관중에게 먼저 들려보세요.

AI Audience는 발표를 비전공자·일반 관중·전문가 관점에서 시뮬레이션하고, 청중이 어디에서 이해를 멈췄는지와 발표자가 무엇을 보완하면 좋을지를 보여주는 발표 리뷰 서비스입니다.

## 문제

발표자는 발표가 끝난 뒤에야 청중이 무엇을 이해했고 어디에서 어려움을 겪었는지 알 수 있습니다. 특히 설명이 부족한 개념, 갑자기 등장한 전문용어, 예시가 필요한 부분은 발표자 스스로 발견하기 어렵습니다.

## 해결 방법

AI Audience는 서로 다른 배경지식과 관심사를 가진 AI 관중을 발표에 참여시킵니다.

```text
발표 녹음
   ↓
AI 관중 시뮬레이션
   ↓
관중별 반응 비교
   ↓
이해가 끊긴 구간과 근거 확인
   ↓
다음 발표를 위한 개선안 확인
```

## 주요 기능

- 비전공자·일반 관중·전문가 Persona 분석
- 관중별 이해도와 반응 차이 확인
- 발표 구조와 Transcript 연결
- 어려웠던 구간과 판단 근거 표시
- 개선이 필요한 문장의 Before / After 예시
- 브라우저 마이크를 이용한 실제 발표 녹음
- STT 및 LLM 기반 실제 발표 분석
- 외부 API 없이 실행되는 전시용 Demo

## 전시용 Demo

`/exhibition`에서 미리 준비된 발표를 선택할 수 있습니다. Demo는 외부 AI API나 Secret을 사용하지 않으므로 전시장에서 네트워크가 불안정해도 선택부터 결과까지 실행됩니다.

| Demo | 보여주는 문제 |
|---|---|
| BFS 발표 | 같은 설명도 청중의 배경지식에 따라 다르게 이해되는 현상 |
| AI 윤리 발표 | 청중마다 관심을 갖는 지점이 달라지는 현상 |
| 학교 프로젝트 발표 | 발표자가 전달했다고 생각한 정보와 청중에게 남는 정보의 차이 |

## 주요 경로

| 경로 | 설명 |
|---|---|
| `/` | 서비스 소개 및 시작 |
| `/exhibition` | 전시용 Demo 선택 |
| `/exhibition/demo-bfs` | BFS Demo 소개 및 시뮬레이션 |
| `/exhibition/demo-ai-ethics` | AI 윤리 Demo 소개 및 시뮬레이션 |
| `/exhibition/demo-recycling` | 학교 프로젝트 Demo 소개 및 시뮬레이션 |
| `/record` | 실제 발표 녹음 |
| `/analyzing/[id]` | 실제 분석 진행 상태 |
| `/result/[id]` | 실제 분석 결과 리포트 |

## 기술 스택

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- TanStack Query
- Zustand
- Zod
- MediaRecorder API
- Groq OpenAI-compatible API

## 프로젝트 구조

```text
전시 Demo
  → 오프라인 Demo Catalog
  → 공통 시뮬레이션
  → 공통 결과 리포트

실제 발표 녹음
  → 음성 업로드 API
  → Speech-to-Text
  → Persona별 LLM 분석
  → Schema 검증
  → 결과 리포트
```

## 로컬 실행

```bash
pnpm install
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열고, 전시 Demo는 [http://localhost:3000/exhibition](http://localhost:3000/exhibition)에서 확인할 수 있습니다.

전체 검증 명령:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## 환경변수

```bash
cp .env.example .env.local
```

전시 Demo는 다음 기본 설정으로 동작합니다.

```env
NEXT_PUBLIC_API_MODE=mock
```

실제 발표 분석을 사용하려면 서버 환경에 다음 값을 설정합니다.

```env
STT_PROVIDER=groq
LLM_PROVIDER=groq
GROQ_API_KEY=
```

기본 Provider:

- 음성 인식: `whisper-large-v3-turbo`
- Persona 및 통합 분석: `openai/gpt-oss-120b`
- 분석 언어: 한국어 중심 출력

`GROQ_API_KEY`는 서버 전용 Secret이며 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. `.env`, `.env.local`, `.env.production`과 실제 Secret은 Git에 커밋하지 않습니다.

배포 환경에서는 Open Graph와 Twitter 카드의 절대 URL 생성을 위해 다음 값을 설정합니다.

```env
NEXT_PUBLIC_SITE_URL=https://배포된-주소.example
```

## 실제 분석 API

- `POST /api/presentations` — 음성 파일 업로드
- `POST /api/presentations/{id}/analyze` — 분석 시작
- `GET /api/presentations/{id}/status` — 분석 상태 조회
- `GET /api/presentations/{id}/result` — 검증된 결과 조회

모든 외부 AI 응답은 Schema 검증 뒤 결과 화면에 전달됩니다. Provider 응답이 예상 형식과 다르면 제한된 횟수만 재시도합니다.

## 저장소 관련 안내

현재 MVP의 실제 발표 데이터와 업로드 음성은 메모리 저장소를 사용합니다. 서버가 재시작되면 실제 발표 데이터와 업로드 파일은 사라집니다. 전시용 Demo는 이 저장소와 독립적인 정적 번들 데이터에서 실행됩니다.

## CI

GitHub Actions는 `main`에 Push하거나 Pull Request를 만들 때 다음 검사를 실행합니다.

```text
의존성 설치 → TypeScript 검사 → Lint → 테스트 → Production Build
```

## 디자인 및 문서

- 제품 요구사항: `PRODUCT.md`
- 디자인 토큰 및 원칙: `DESIGN (4).md`
- 전시 브라우저 QA: `docs/qa/exhibition-qa.mjs`

## 라이선스

현재 별도 오픈소스 라이선스는 지정하지 않았습니다.
