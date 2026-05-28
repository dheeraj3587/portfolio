"use client";

/**
 * AnimatedCounter — animates a numeric value from 0 toward `target` using
 * the shared `motion` spring vocabulary, then renders the bare target as
 * plain text once the spring settles.
 *
 * Validates Requirements 2.5, 2.6, 19.2:
 *   - Convergence ceiling: the rendered text equals `String(target)` within
 *     `durationMs` (default 1500 ms, Requirement 2.5).
 *   - Plain-text settle: once converged, the DOM contains `<span>{target}{suffix}</span>`
 *     with no motion-driven children — there are no motion artifacts left
 *     in the tree.
 *   - Reduced-motion handoff: when `useReducedMotionState()` is true, the
 *     target is rendered on first paint with no spring activity at all
 *     (Requirements 2.6, 17.2).
 */

import { useEffect, useRef, useState } from "react";
import { useSpring } from "motion/react";

import { useReducedMotionState } from "@/lib/motion-engine";

export interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  /** Convergence budget in milliseconds. Hard ceiling per Requirement 2.5. */
  durationMs?: number;
  className?: string;
}

/**
 * Spring tuned so a target ≤ 1_000_000 settles comfortably within the
 * 1500 ms ceiling from a standing start. The on-mount `setTimeout` below
 * also acts as a hard deadline so the rendered text is guaranteed to
 * equal `String(target)` once `durationMs` has elapsed, regardless of
 * the underlying spring trajectory.
 */
const SPRING_CONFIG = { stiffness: 60, damping: 20 } as const;

/**
 * Once the live spring value is within half a unit of the target the
 * rounded display is indistinguishable from the target itself, so we
 * snap to the bare target and stop subscribing.
 */
const SETTLE_EPSILON = 0.5;

export function AnimatedCounter({
  target,
  suffix,
  durationMs = 1500,
  className,
}: AnimatedCounterProps) {
  const reduced = useReducedMotionState();
  const [displayValue, setDisplayValue] = useState<number>(0);
  const [settled, setSettled] = useState<boolean>(false);
  const settledRef = useRef<boolean>(false);

  // Spring driver — initialised at 0 so the very first paint shows `0`
  // (or `target` under reduced motion via the rendered branch below).
  const spring = useSpring(0, SPRING_CONFIG);

  useEffect(() => {
    // Reduced motion: never schedule a spring or a deadline. The render
    // branch below already shows the target on first paint.
    if (reduced) return;

    // Reset for a fresh animation when target/durationMs/reduced changes.
    settledRef.current = false;
    setSettled(false);
    setDisplayValue(0);
    spring.set(target);

    const settle = () => {
      if (settledRef.current) return;
      settledRef.current = true;
      setDisplayValue(target);
      setSettled(true);
    };

    const unsubscribe = spring.on("change", (latest: number) => {
      if (settledRef.current) return;
      if (Math.abs(latest - target) < SETTLE_EPSILON) {
        settle();
        unsubscribe();
        return;
      }
      setDisplayValue(Math.round(latest));
    });

    // Hard deadline — guarantees the property "rendered text equals
    // String(target) after durationMs" holds even when the spring
    // happens to be a sliver short of the epsilon window.
    const deadline = setTimeout(() => {
      if (settledRef.current) return;
      settle();
      unsubscribe();
    }, durationMs);

    return () => {
      clearTimeout(deadline);
      unsubscribe();
    };
  }, [reduced, target, durationMs, spring]);

  // Reduced motion → target on first paint. Otherwise render the live
  // rounded spring value until settle, then the bare target.
  const rendered = reduced || settled ? target : displayValue;

  return (
    <span className={className}>
      {rendered}
      {suffix ?? ""}
    </span>
  );
}
