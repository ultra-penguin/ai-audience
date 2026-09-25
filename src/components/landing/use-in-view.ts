"use client";

import { useEffect, useRef } from "react";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * Scroll entrance that can never leave content blank.
 *
 * Content has no hidden resting state: the server, the first client render, anything already on
 * screen (or above it) at mount, and a full-page capture that never scrolls all show the final
 * state. Only an element still entirely below the viewport is observed; when it comes within
 * `bottomMargin` of the viewport (threshold 0, positive margin = just before it scrolls in) the DOM
 * attribute `data-reveal="play"` is set — never React state, so no re-render or hydration
 * mismatch — and CSS runs a one-shot entrance keyframe from it. `onReveal` fires at the same time.
 */
export function useScrollReveal<T extends HTMLElement>(onReveal?: (node: T) => void, bottomMargin = "10%") {
  const ref = useRef<T>(null);
  const onRevealRef = useRef(onReveal);
  useEffect(() => {
    onRevealRef.current = onReveal;
  });
  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    if (node.getBoundingClientRect().top < window.innerHeight) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        node.dataset.reveal = "play";
        onRevealRef.current?.(node);
      },
      { threshold: 0, rootMargin: `0px 0px ${bottomMargin} 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [bottomMargin]);
  return ref;
}
