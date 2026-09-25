"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "./use-in-view";

const STATEMENTS = [
  { text: "그렇다면 발표를 평가할 때 “발표자는 무엇을 말했는가?”만 보면 될까요?", size: "text-[1.625rem] leading-[1.3] sm:text-[2.25rem] lg:text-[2.75rem]", tone: "text-on-surface" },
  { text: "“청중은 무엇을 받아들였는가?”", size: "text-[2rem] leading-[1.2] sm:text-[3rem] lg:text-[3.75rem]", tone: "text-on-surface" },
  { text: "우리는 평가자가 아니라, 청중을 만들었습니다.", size: "text-[1.625rem] leading-[1.3] sm:text-[2.25rem] lg:text-[2.75rem]", tone: "text-primary" },
] as const;

/** When each later line lands after the block is well in view (ms). */
const STEP_AT = [900, 1900] as const;

// "Before" states, keyed off `data-step`, which only the effect below ever sets.
const BEFORE_1 = "motion-js:group-data-[step=0]/p:translate-y-6 motion-js:group-data-[step=0]/p:opacity-0";
const BEFORE_2 = `${BEFORE_1} motion-js:group-data-[step=1]/p:translate-y-6 motion-js:group-data-[step=1]/p:opacity-0`;
const OPENING_EMPHASIS = "motion-js:group-data-[step=0]/p:opacity-100";

/**
 * Section 04: typographic turn from "what did the presenter say?" to "what did the audience take in?".
 *
 * A normal-flow block (no scroll-jacking, no sticky runway). The server/no-JS/reduced-motion render —
 * and anything that never scrolls, like a full-page capture — is the final composition: all three
 * lines, the opening question receded. With motion, a block that starts below the viewport is armed
 * at step 0 just before it scrolls in, then steps 0 → 1 → 2 on a short timer once it is well in view.
 */
export function PerspectiveShift() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    if (node.getBoundingClientRect().top < window.innerHeight) return;
    const timers: number[] = [];
    const play = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        play.disconnect();
        timers.push(
          window.setTimeout(() => (node.dataset.step = "1"), STEP_AT[0]),
          window.setTimeout(() => delete node.dataset.step, STEP_AT[1]),
        );
      },
      { threshold: 0, rootMargin: "0px 0px -35% 0px" },
    );
    const arm = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        arm.disconnect();
        node.dataset.step = "0";
        play.observe(node);
      },
      { threshold: 0, rootMargin: "0px 0px 10% 0px" },
    );
    arm.observe(node);
    return () => {
      arm.disconnect();
      play.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      delete node.dataset.step;
    };
  }, []);

  return (
    <section
      ref={ref}
      id="perspective"
      aria-labelledby="perspective-title"
      className="group/p scroll-mt-20 border-t border-outline-variant/60 py-20 sm:py-28 2xl:py-32"
    >
      <h2 id="perspective-title" className="sr-only">
        관점의 전환
      </h2>
      <div className="mx-auto max-w-4xl space-y-7 text-center text-balance sm:space-y-9">
        {STATEMENTS.map((s, i) => (
          <p
            key={i}
            className={cn(
              "font-semibold tracking-[-0.03em]",
              s.size,
              s.tone,
              "motion-js:transition-[opacity,translate] motion-js:duration-700 motion-js:ease-out",
              // Final composition: the opening question recedes once the audience's question arrives.
              i === 0 && ["opacity-55", OPENING_EMPHASIS],
              i === 1 && BEFORE_1,
              i === 2 && BEFORE_2,
            )}
          >
            {s.text}
          </p>
        ))}
      </div>
    </section>
  );
}
