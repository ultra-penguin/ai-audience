"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const STATEMENTS = [
  { text: "그렇다면 발표를 평가할 때 “발표자는 무엇을 말했는가?”만 보면 될까요?", size: "text-[1.625rem] leading-[1.3] sm:text-[2.25rem] lg:text-[2.75rem]", tone: "text-on-surface" },
  { text: "“청중은 무엇을 받아들였는가?”", size: "text-[2rem] leading-[1.2] sm:text-[3rem] lg:text-[3.75rem]", tone: "text-on-surface" },
  { text: "우리는 평가자가 아니라, 청중을 만들었습니다.", size: "text-[1.625rem] leading-[1.3] sm:text-[2.25rem] lg:text-[2.75rem]", tone: "text-primary" },
] as const;

/**
 * Section 04: typographic turn from "what did the presenter say?" to "what did the audience take in?".
 *
 * The final composition (all three lines, the first one receded) is the server/no-JS/reduced-motion
 * render. With motion, the section grows tall, the lines sit in a sticky frame, and three invisible
 * scroll "tracks" (IntersectionObserver against the viewport's centre line) step 0 → 1 → 2.
 */
export function PerspectiveShift() {
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const tracks = trackRefs.current.filter((t): t is HTMLDivElement => t !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setStep(Number((entry.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    tracks.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="perspective"
      aria-labelledby="perspective-title"
      data-step={step}
      className="relative scroll-mt-20 border-t border-outline-variant/60 motion-js:min-h-[240svh]"
    >
      <h2 id="perspective-title" className="sr-only">
        관점의 전환
      </h2>
      {/* Scroll tracks: only meaningful when the section is tall (motion-js). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden motion-js:block">
        {STATEMENTS.map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              trackRefs.current[i] = el;
            }}
            data-step={i}
            className="absolute inset-x-0 h-1/3"
            style={{ top: `${(i * 100) / 3}%` }}
          />
        ))}
      </div>

      <div className="flex items-center justify-center py-24 motion-js:sticky motion-js:top-0 motion-js:min-h-svh motion-js:py-16">
        <div className="mx-auto max-w-4xl space-y-8 text-center text-balance sm:space-y-10">
          {STATEMENTS.map((s, i) => (
            <p
              key={i}
              data-shown={step >= i || undefined}
              data-current={step === i || undefined}
              className={cn(
                "font-semibold tracking-[-0.03em]",
                s.size,
                s.tone,
                // Final composition: the opening question recedes once the audience's question arrives.
                i === 0 && "opacity-55",
                "motion-js:transition-[opacity,translate] motion-js:duration-700 motion-js:ease-out",
                "motion-js:not-data-shown:translate-y-6 motion-js:not-data-shown:opacity-0",
                i === 0 && "motion-js:data-current:opacity-100",
              )}
            >
              {s.text}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
