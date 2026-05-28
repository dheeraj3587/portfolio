/**
 * Property 19: Magnetic-hover offset is bounded by 8 pixels.
 *
 * Validates: Requirement 6.1
 *
 * For any pointer position (any finite or non-finite coordinates) and any
 * element bounding box with `width > 0` and `height > 0`, the pure helper
 * `computeMagneticOffset(pointer, bounds)` exposed by
 * `@/components/portfolio/tech-icon` SHALL return `{ dx, dy }` such that
 * `|dx| ≤ 8` AND `|dy| ≤ 8`.
 *
 * The cap of 8 px matches `MAGNETIC_CAP_PX` in `tech-icon.tsx`, which is the
 * Requirement 6.1 budget for the per-axis magnetic translation applied to
 * each tech-stack icon. The test deliberately samples pointer coordinates
 * far outside the icon (the icon is at most 5000 × 5000 px in this test
 * but the pointer is allowed to range over the full `fc.float()` space) so
 * the clamp is exercised, not just the linear region.
 *
 * Edge cases also asserted:
 *   - Collapsed bounds (`width === 0` or `height === 0`) → `{ dx: 0, dy: 0 }`
 *   - Non-finite pointer / bounds (NaN, ±Infinity, negative width/height)
 *     remain inside the ±8 budget — the helper treats non-finite numbers
 *     as 0 and treats non-positive bounds as collapsed.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

import { computeMagneticOffset } from "@/components/portfolio/tech-icon";

describe("Property 19: magnetic-hover offset is bounded by 8 px", () => {
  it("|dx| ≤ 8 and |dy| ≤ 8 for any pointer and any bounds with width > 0 and height > 0", () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.float({ noNaN: true }),
          y: fc.float({ noNaN: true }),
        }),
        fc.record({
          width: fc.float({
            min: Math.fround(0.1),
            max: 5000,
            noNaN: true,
          }),
          height: fc.float({
            min: Math.fround(0.1),
            max: 5000,
            noNaN: true,
          }),
        }),
        (pointer, bounds) => {
          const { dx, dy } = computeMagneticOffset(pointer, bounds);
          expect(Math.abs(dx)).toBeLessThanOrEqual(8);
          expect(Math.abs(dy)).toBeLessThanOrEqual(8);
        },
      ),
    );
  });

  it("returns (0, 0) when bounds collapse on either axis", () => {
    expect(
      computeMagneticOffset({ x: 100, y: 100 }, { width: 0, height: 100 }),
    ).toEqual({ dx: 0, dy: 0 });
    expect(
      computeMagneticOffset({ x: 100, y: 100 }, { width: 100, height: 0 }),
    ).toEqual({ dx: 0, dy: 0 });
    expect(
      computeMagneticOffset({ x: 100, y: 100 }, { width: 0, height: 0 }),
    ).toEqual({ dx: 0, dy: 0 });
  });

  it("treats non-finite inputs as 0 and stays within the ±8 budget", () => {
    // NaN pointer coords → coords are normalized to 0 before the clamp,
    // so the result still stays inside ±8 on both axes.
    const fromNaN = computeMagneticOffset(
      { x: Number.NaN, y: Number.NaN },
      { width: 44, height: 44 },
    );
    expect(Math.abs(fromNaN.dx)).toBeLessThanOrEqual(8);
    expect(Math.abs(fromNaN.dy)).toBeLessThanOrEqual(8);

    // ±Infinity pointer coords are also normalized to 0 before the clamp,
    // so the result still stays inside ±8 on both axes.
    const fromInfinity = computeMagneticOffset(
      { x: Number.POSITIVE_INFINITY, y: Number.NEGATIVE_INFINITY },
      { width: 44, height: 44 },
    );
    expect(Math.abs(fromInfinity.dx)).toBeLessThanOrEqual(8);
    expect(Math.abs(fromInfinity.dy)).toBeLessThanOrEqual(8);

    // Negative bounds are treated as collapsed (Requirement 6.1: the helper
    // never has to pre-validate `getBoundingClientRect()` output).
    expect(
      computeMagneticOffset(
        { x: 100, y: 100 },
        { width: -44, height: 44 },
      ),
    ).toEqual({ dx: 0, dy: 0 });
    expect(
      computeMagneticOffset(
        { x: 100, y: 100 },
        { width: 44, height: -44 },
      ),
    ).toEqual({ dx: 0, dy: 0 });
  });

  it("clamps far-off pointer coordinates to exactly ±8 on each axis", () => {
    // Pointer well to the right and below the bounds — both axes should
    // saturate to +8.
    const farPositive = computeMagneticOffset(
      { x: 10_000, y: 10_000 },
      { width: 44, height: 44 },
    );
    expect(farPositive.dx).toBe(8);
    expect(farPositive.dy).toBe(8);

    // Pointer well to the left and above the bounds — both axes should
    // saturate to −8.
    const farNegative = computeMagneticOffset(
      { x: -10_000, y: -10_000 },
      { width: 44, height: 44 },
    );
    expect(farNegative.dx).toBe(-8);
    expect(farNegative.dy).toBe(-8);
  });
});
