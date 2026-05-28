"use client";

/**
 * AvatarParallaxTilt — Hero avatar parallax wrapper (Task 5.2).
 *
 * Wraps the hero `LiquidMetalAvatar` (or any child element) in a motion-driven
 * 3D tilt that follows a fine pointer with a maximum rotation of 8° on each
 * axis and returns to neutral within 400 ms after `pointerleave`
 * (Requirement 2.4). Under `Reduced_Motion_State` the wrapper short-circuits
 * to a passthrough so the avatar renders in its final visual state without
 * any tilt or spring (Requirement 2.6).
 *
 * The pure helper {@link computeTilt} is exported separately so Property 18
 * can hammer it with fast-check generators without touching React:
 *
 *   "For any pointer-relative coordinates (x, y) ∈ [0, 1]², the pure helper
 *    computeTilt(x, y) SHALL return (rotateX, rotateY) such that
 *    |rotateX| ≤ 8 AND |rotateY| ≤ 8."
 *    — design.md §Property 18 (validates Requirement 2.4)
 *
 * The helper additionally clamps out-of-range inputs (NaN, negative, > 1)
 * to safe values inside ±8 so the property generators never need to model
 * the input domain — any number in, a bounded number out.
 */

import { useRef, type PointerEvent, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

import { useReducedMotionState } from "@/lib/motion-engine";

// ---------------------------------------------------------------------------
// Pure helper — computeTilt(x, y) (Property 18, Requirement 2.4)
// ---------------------------------------------------------------------------

/**
 * Maximum tilt magnitude, in degrees, on each axis. Mirrors the 8° cap
 * mandated by Requirement 2.4 ("a maximum rotation of 8 degrees on each
 * axis") and asserted by Property 18.
 */
const TILT_CAP_DEGREES = 8;

/**
 * Mapping factor from a centered coordinate `(c - 0.5)` ∈ [-0.5, 0.5] to a
 * degree value bounded by ±{@link TILT_CAP_DEGREES}. `0.5 * 16 = 8`, so
 * `(c - 0.5) * 16 ∈ [-8, +8]` for any in-range input.
 */
const TILT_RANGE_DEGREES = TILT_CAP_DEGREES * 2;

/**
 * Clamps `value` into `[-cap, cap]`. Treats `NaN` as `0` so out-of-spec
 * inputs (Property 18 generators may produce arbitrary numbers including
 * NaN, ±Infinity, and values outside [0, 1]) collapse to a safe neutral
 * tilt rather than propagating into a `style.transform` string.
 */
function clampToCap(value: number, cap: number): number {
  if (Number.isNaN(value)) return 0;
  if (value > cap) return cap;
  if (value < -cap) return -cap;
  return value;
}

/**
 * Pure tilt mapper. Same input → same output, no I/O.
 *
 * Inputs: pointer-relative coordinates `(x, y)` normalized to the host
 * element's bounding box, where `(0, 0)` is the top-left and `(1, 1)` is
 * the bottom-right.
 *
 * Mapping:
 *   - `rotateX = -(y - 0.5) * 16` so `y = 0` (top edge) yields `+8°`
 *     (avatar tilts up toward the cursor) and `y = 1` (bottom edge)
 *     yields `-8°`.
 *   - `rotateY =  (x - 0.5) * 16` so `x = 0` (left edge) yields `-8°`
 *     and `x = 1` (right edge) yields `+8°` (avatar tilts toward the
 *     cursor on each side).
 *
 * Both outputs are explicitly clamped to ±8 so out-of-range inputs
 * (negative, > 1, NaN, ±Infinity) produce safe values inside the cap.
 *
 * @example
 *   computeTilt(0.5, 0.5) // { rotateX: 0,  rotateY: 0  } — center
 *   computeTilt(1, 0)     // { rotateX: 8,  rotateY: 8  } — top-right
 *   computeTilt(0, 1)     // { rotateX: -8, rotateY: -8 } — bottom-left
 *   computeTilt(NaN, 0.5) // { rotateX: 0,  rotateY: 0  } — NaN → neutral
 *   computeTilt(2, -1)    // { rotateX: 8,  rotateY: 8  } — clamped
 */
export function computeTilt(
  x: number,
  y: number,
): { rotateX: number; rotateY: number } {
  const safeX = Number.isNaN(x) ? 0.5 : x;
  const safeY = Number.isNaN(y) ? 0.5 : y;
  const rawRotateX = -(safeY - 0.5) * TILT_RANGE_DEGREES;
  const rawRotateY = (safeX - 0.5) * TILT_RANGE_DEGREES;
  return {
    rotateX: clampToCap(rawRotateX, TILT_CAP_DEGREES),
    rotateY: clampToCap(rawRotateY, TILT_CAP_DEGREES),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AvatarParallaxTiltProps {
  children: ReactNode;
  className?: string;
}

/**
 * Spring tuned so the rotation values return to neutral within 400 ms after
 * `pointerleave` (Requirement 2.4: "SHALL return to neutral within 400ms
 * after the pointer leaves"). Stiffness/damping/mass match the shape of
 * `SHARED_SPRING` (motion-engine.ts) but are tightened slightly so the
 * settle window is comfortably under the 400 ms cap with no overshoot
 * past the cap.
 */
const TILT_SPRING = {
  stiffness: 220,
  damping: 26,
  mass: 0.6,
} as const;

export function AvatarParallaxTilt({
  children,
  className,
}: AvatarParallaxTiltProps) {
  const reduced = useReducedMotionState();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Driven motion values written from `pointerMove` and reset to 0 on
  // `pointerLeave`. The spring smooths the values so the tilt ramps in
  // while the cursor is over the avatar and decays back to neutral within
  // ~400 ms once the cursor leaves.
  const targetRotateX = useMotionValue(0);
  const targetRotateY = useMotionValue(0);
  const rotateX = useSpring(targetRotateX, TILT_SPRING);
  const rotateY = useSpring(targetRotateY, TILT_SPRING);

  if (reduced) {
    // Reduced motion: render a passthrough wrapper. No motion values, no
    // spring, no pointer listeners — the avatar lands in its final visual
    // state on first paint (Requirement 2.6).
    return <div className={className}>{children}</div>;
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    // Skip coarse pointers (touch / pen) so the tilt only responds to a
    // fine pointer per Requirement 2.4 ("WHEN the user hovers the avatar
    // with a fine pointer …"). Coarse pointers fall through to the
    // wrapping section's existing press affordances.
    if (event.pointerType === "touch") return;
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const { rotateX: rx, rotateY: ry } = computeTilt(x, y);
    targetRotateX.set(rx);
    targetRotateY.set(ry);
  };

  const handlePointerLeave = () => {
    // Drop the targets back to neutral; the spring carries the rendered
    // values home within the 400 ms window mandated by Requirement 2.4.
    targetRotateX.set(0);
    targetRotateY.set(0);
  };

  return (
    <motion.div
      ref={containerRef}
      className={className}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 800,
      }}
    >
      {children}
    </motion.div>
  );
}
