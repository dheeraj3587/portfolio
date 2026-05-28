"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe hook that tracks the user's `prefers-reduced-motion` preference.
 *
 * The initial render value is always `false` so the server-rendered output
 * matches the first client render and React does not log a hydration warning.
 * After mount, the hook subscribes to `window.matchMedia(...)` and reflects
 * the live value, updating when the OS-level preference changes.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(mql.matches);

    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return reduced;
}
