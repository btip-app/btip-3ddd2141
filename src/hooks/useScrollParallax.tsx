import { useEffect, useState, useCallback } from "react";

/**
 * Returns a normalized scroll progress (0–1) for the current viewport.
 * Respects reduced-motion by returning 0.
 */
export function useScrollParallax() {
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(1);

  const handleScroll = useCallback(() => {
    setScrollY(window.scrollY);
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    setViewportHeight(window.innerHeight);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return { scrollY, viewportHeight };
}
