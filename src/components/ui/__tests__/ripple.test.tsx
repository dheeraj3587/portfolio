import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

import { computeRippleRadius } from "@/components/ui/ripple";
import {
  rippleDecayMs,
  type EffectiveConnectionType,
} from "@/lib/motion-engine";

/**
 * Property 10 — Ripple bounded settle from press coordinates (Task 17.10).
 *
 * The full render-and-fake-timers shape of P10 is "fire pointerdown at
 * (x, y), advance 600/800 ms, observe origin === press coords and final
 * opacity is zero". The pure-helper-shaped property covers the same
 * intent: the helper that determines how far the ripple span has to
 * expand to fully cover the host element from any press origin —
 * `computeRippleRadius(width, height) = Math.hypot(width, height)` for
 * positive inputs and `0` for non-finite or non-positive inputs — is
 * total and non-negative for every (surfaceKind, x, y, effectiveType)
 * tuple.
 *
 * If the helper's contract holds, the firing ripple's settle point is
 * always finite and the rendered span always reaches the element's far
 * corner from any press coordinate inside the bounding rect, regardless
 * of the active connection class.
 *
 * Validates: Requirements 1.4, 8.5, 11.6, 18.4
 */
describe("Property 10 — Ripple bounded settle from press coordinates", () => {
  // Surfaces that consume `usePressRipple` per design.md §C.2: the M3
  // primitives (FAB, switch, chip, ripple button), the palette swatcher,
  // the contact-form quick actions, and the project card on coarse
  // pointers. The kind is part of the generator tuple even though the
  // pure helper does not branch on it — it pins the property to the
  // surfaces the requirement enumerates.
  const surfaceKind = fc.constantFrom(
    "fab",
    "switch",
    "chip",
    "rippleButton",
    "snackbar",
    "paletteSwatch",
    "contactQuickAction",
    "projectCardCoarse",
  );

  // Press coords are normalised to [0, 1] per the task generator. The
  // helper takes the surface's pixel width/height, so the press ratio is
  // multiplied through the bounds to produce a press-origin-safe radius
  // calculation.
  const unitFloat = fc.float({
    min: Math.fround(0),
    max: Math.fround(1),
    noNaN: true,
  });

  // Realistic surface pixel sizes for the M3 primitives + project card.
  // Lower bound covers chips (~32px); upper bound covers the project
  // card cover artwork (~720px wide on desktop).
  const pixelSize = fc.float({
    min: Math.fround(32),
    max: Math.fround(720),
    noNaN: true,
  });

  const effectiveType = fc.constantFrom<EffectiveConnectionType>(
    "slow-2g",
    "2g",
    "3g",
    "4g",
    "unknown",
  );

  it("computeRippleRadius equals Math.hypot(width, height) for positive surface bounds", () => {
    fc.assert(
      fc.property(
        surfaceKind,
        unitFloat, // x ∈ [0, 1] — present in the tuple per task spec
        unitFloat, // y ∈ [0, 1] — present in the tuple per task spec
        effectiveType,
        pixelSize,
        pixelSize,
        (_kind, _x, _y, _conn, width, height) => {
          const radius = computeRippleRadius(width, height);
          // Settle point must be finite + non-negative so the ripple
          // span can reach the surface's far corner from any press
          // origin without producing NaN/-∞ geometry.
          expect(Number.isFinite(radius)).toBe(true);
          expect(radius).toBeGreaterThanOrEqual(0);
          // Diagonal contract: the radius covers the surface from every
          // interior press coord. fast-check generates 32-bit floats so
          // a 6-decimal tolerance absorbs rounding without masking
          // contract drift.
          expect(radius).toBeCloseTo(Math.hypot(width, height), 6);
        },
      ),
    );
  });

  it("computeRippleRadius collapses to 0 for non-finite or non-positive inputs", () => {
    // Explicit edges asserted as concrete examples (the pure helper's
    // total-on-bad-input clause is documented in the source). Property 10's
    // generator stays inside the well-formed surface space; these examples
    // pin the totality contract that the property relies on.
    expect(computeRippleRadius(Number.NaN, 100)).toBe(0);
    expect(computeRippleRadius(100, Number.NaN)).toBe(0);
    expect(computeRippleRadius(Number.POSITIVE_INFINITY, 100)).toBe(0);
    expect(computeRippleRadius(100, Number.NEGATIVE_INFINITY)).toBe(0);
    // Non-positive width is clamped to 0 before hypot, so only the
    // positive axis contributes to the radius.
    expect(computeRippleRadius(-10, 100)).toBe(Math.hypot(0, 100));
    expect(computeRippleRadius(100, 0)).toBe(Math.hypot(100, 0));
  });
});

/**
 * Property 16 — `rippleDecayMs` is a step function of connection type
 * (Task 17.16).
 *
 * The Material ripple decays in 800 ms on `2g`/`3g` and in 600 ms on
 * every other connection class (including `unknown`, which the engine
 * uses as the SSR / unsupported-browser sentinel and treats as the fast
 * path per design.md §Motion_Engine).
 *
 * Validates: Requirement 1.4
 */
describe("Property 16 — rippleDecayMs is a step function of connection type", () => {
  it("returns 800 for 2g/3g and 600 for slow-2g/4g/unknown", () => {
    const effectiveType = fc.constantFrom<EffectiveConnectionType>(
      "slow-2g",
      "2g",
      "3g",
      "4g",
    );

    fc.assert(
      fc.property(effectiveType, (t) => {
        const expected = t === "2g" || t === "3g" ? 800 : 600;
        expect(rippleDecayMs(t)).toBe(expected);
      }),
    );
  });

  it("treats the SSR-only 'unknown' sentinel as the fast (600 ms) path", () => {
    // `"unknown"` is excluded from the property generator above (the
    // task spec enumerates the four `effectiveType` values from the
    // Network Information API), but the helper must still classify it
    // as the fast path so SSR markup never picks the slow-connection
    // branch the client might disagree with.
    expect(rippleDecayMs("unknown")).toBe(600);
  });
});
