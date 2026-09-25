import type { Reception, Understanding } from "@/shared/api/types";
import type { DemoMoment } from "./landing-data";

/** A persona's overall understanding, spoken in the same qualitative words as a single moment (D2: never a score). */
export const UNDERSTANDING_RECEPTION: Record<Understanding, Reception> = {
  followed: "clear",
  partly_lost: "partial",
  lost: "lost",
};

/** "N명의 관중 중 M명…" — only ever computed from the demo data (D5). */
export function momentSummary(moment: DemoMoment): string {
  const total = moment.listeners.length;
  const lost = moment.listeners.filter((l) => l.reception === "lost").length;
  if (moment.wavered === 0) return `${total}명의 관중 모두 이 구간을 따라왔어요.`;
  const base = `${total}명의 관중 중 ${moment.wavered}명이 같은 구간에서 이해가 흔들렸어요.`;
  return lost > 0 ? `${base} 그중 ${lost}명은 완전히 막혔어요.` : base;
}

/** The moment the exhibit opens on: the first one where anybody wavered. */
export function defaultMomentIndex(moments: DemoMoment[]): number {
  return Math.max(0, moments.findIndex((m) => m.wavered > 0));
}
