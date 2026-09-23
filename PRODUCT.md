# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion, TanStack Query, Zustand, Zod, MediaRecorder API, Recharts, pnpm

## Users

Primary users are people preparing a presentation who need to discover comprehension gaps before presenting to a real audience. They record a spoken presentation in a browser, review simulated audience reactions, and identify specific changes to make.

## Product Purpose

AI Virtual Audience Presentation Reviewer lets a presenter play their real spoken presentation to several AI audience personas and see where understanding, attention, terminology, examples, and key messages may fail. Success means the presenter can find and act on a concrete improvement before the real presentation.

## Positioning

The product connects an actual presentation recording to multiple distinct audience viewpoints, then links each difficult point to a reason and a repair suggestion. It is not a generic speech score or a presentation generator.

## Operating Context

The core workflow is a short browser session: open the service, grant microphone access, record or pause a talk, finish the recording, start analysis, wait through visible pipeline stages, and inspect an overall summary, persona feedback, difficult transcript sections, and improvement suggestions.

## Capabilities and Constraints

- MVP supports microphone recording, pause/resume, finish, duration display, upload, asynchronous analysis, status, structured results, persona feedback, difficult sections, missing explanations, and example suggestions.
- MVP uses 3–5 audience personas representing distinct evaluation perspectives, not synthetic voice actors.
- Frontend must support mock-first development and later API replacement.
- Required API surface: create presentation, start analysis, get status, get result.
- Excluded: video/camera analysis, real-time feedback, auto-generated talks or scripts, synthetic audience voices, accounts, history, social features, payments, mobile app, and admin dashboard.
- Existing design-system files are authoritative when they appear; this empty repository has none yet.

## Brand Commitments

Product name: AI 가상 관중 발표 리뷰어. Voice should be clear, calm, practical, and focused on what the presenter should fix. Avoid AI spectacle, gradients/glow, and dashboard-like density.

## Evidence on Hand

The supplied MVP PRD is the current product brief. No production audio, transcripts, brand assets, testimonials, or customer evidence exist in the repository; illustrative demo data must be labeled as sample/mock data.

## Product Principles

1. Show the presenter what to do next.
2. Lead with audience perspective, then explain the blockage, then suggest a repair.
3. Prefer actionable feedback over decorative scoring.
4. Make every state understandable: recording, uploading, analyzing, complete, failed, and empty.
5. Keep the MVP focused on one real recorded presentation and its review.

## Accessibility & Inclusion

Use accessible controls, visible keyboard focus, clear status text, responsive layouts, readable contrast, and explicit recovery guidance for microphone, upload, analysis, and empty-result failures. The persona set should represent different knowledge and attention contexts without treating any single audience as the default.
