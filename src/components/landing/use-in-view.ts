"use client";

import { useEffect, useRef, useState } from "react";

/**
 * True once the element has scrolled into view (never flips back).
 * Starts `false` on the server and the first client render, so it never causes a hydration mismatch.
 */
export function useInView<T extends Element>(threshold = 0.35, rootMargin = "0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, threshold, rootMargin]);
  return { ref, inView };
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
