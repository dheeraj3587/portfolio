/**
 * Property 17: Staggered-reveal delays are linear in child index.
 *
 * Validates: Requirements 2.1, 6.4
 *
 * For any stepMs ∈ [40, 160] and any childIndex ∈ [0, 7], the pure helper
 * `staggerDelay(stepMs, childIndex)` exposed by `@/lib/motion-engine`
 * SHALL equal `(stepMs * childIndex) / 1000` (seconds) and be finite.
 *
 * The interval [40, 160] matches `motionDurations.staggerStepMin` /
 * `staggerStepMax` (Requirement 2.1 — hero per-element stagger budget).
 * The child index range [0, 7] mirrors the maximum number of staggered
 * reveal targets used by the hero and Tech_Stack_Grid sections so the
 * generators only sweep the input space the engine actually sees.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

import { staggerDelay } from "@/lib/motion-engine";

describe("Property 17: staggerDelay linearity", () => {
  it("staggerDelay(stepMs, childIndex) === (stepMs * childIndex) / 1000 and is finite", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 40, max: 160 }),
        fc.integer({ min: 0, max: 7 }),
        (stepMs, childIndex) => {
          const result = staggerDelay(stepMs, childIndex);
          expect(result).toBe((stepMs * childIndex) / 1000);
          expect(Number.isFinite(result)).toBe(true);
        },
      ),
    );
  });
});
