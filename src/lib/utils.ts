import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the custom type scale so `text-label-md` isn't treated
// as a colour and doesn't strip `text-on-primary` (and vice versa).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display-lg", "display-lg-mobile", "headline-xl", "headline-xl-mobile", "headline-lg", "headline-md", "headline-sm", "body-xl", "body-lg", "body-md", "body-sm", "label-lg", "label-md", "label-sm"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 372 → "6:12"; 3725 → "1:02:05". */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** 372 → "6분 12초", for screen readers and prose. */
export function formatDurationLong(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}초`;
  return sec === 0 ? `${m}분` : `${m}분 ${sec}초`;
}

/** Route params may arrive percent-encoded; never throw on malformed input. */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
