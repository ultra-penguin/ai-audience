import type { AnalysisStage, Persona } from "@/shared/api/types";

export type AudienceSeat = Pick<Persona, "kind" | "name" | "description" | "listensFor"> & {
  /** Single character shown in the seat avatar. */
  glyph: string;
};

/**
 * The three fixed perspectives the real analysis always uses
 * (FIXED_PERSONAS in src/lib/presentations/analysis.ts). Shown before a result
 * exists — on the landing page and while the backend is analysing.
 */
export const AUDIENCE_SEATS: readonly AudienceSeat[] = [
  {
    kind: "beginner",
    name: "비전공 관중",
    glyph: "비",
    description: "관련 배경지식 없이 발표자의 설명만으로 이해하려는 관중이에요.",
    listensFor: "처음 듣는 말도 쉬운 말과 예시로 풀어 주는지",
  },
  {
    kind: "peer",
    name: "일반 관중",
    glyph: "일",
    description: "주제에 관심이 있고 일반적인 업무 경험이 있는 관중이에요.",
    listensFor: "흐름과 핵심 메시지가 한 번에 잡히는지",
  },
  {
    kind: "expert",
    name: "전문가 관중",
    glyph: "전",
    description: "세부 내용과 근거, 한계를 검토할 수 있는 관중이에요.",
    listensFor: "주장의 근거와 방법이 충분히 구체적인지",
  },
];

export type SeatState = "waiting" | "listening" | "listened" | "stopped";

/**
 * What the audience is doing, derived only from the backend's reported stage.
 * The seats never move ahead of the pipeline: they listen only in "listening".
 */
export function seatStateFor(stage: AnalysisStage | undefined): SeatState {
  switch (stage) {
    case "listening":
      return "listening";
    case "synthesizing":
    case "cross_check":
    case "completed":
      return "listened";
    case "failed":
      return "stopped";
    default:
      return "waiting";
  }
}

export const SEAT_STATE_LABEL: Record<SeatState, string> = {
  waiting: "기다리는 중",
  listening: "듣는 중",
  listened: "다 들었어요",
  stopped: "멈춤",
};
