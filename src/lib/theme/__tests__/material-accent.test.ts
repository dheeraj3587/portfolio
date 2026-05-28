/**
 * Property tests for `@/lib/theme/material-accent`.
 *
 * Property 8  — Focus-ring contrast ≥ 3:1 across every seed × theme.
 *               (Validates: Requirements 11.7, 17.4, 19.9.)
 * Property 21 — Body / large-text design tokens satisfy WCAG contrast.
 *               (Validates: Requirement 12.4.)
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

import {
  PALETTE_SEEDS,
  SURFACE_TOKENS,
  THEME_TOKEN_PAIRS,
  resolveFocusRing,
  wcagContrast,
} from "@/lib/theme/material-accent";

describe("Property 8: focus ring contrast >= 3:1", () => {
  it("every seed × theme combo clears 3:1 against the active surface", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PALETTE_SEEDS),
        fc.constantFrom("light" as const, "dark" as const),
        (seed, theme) => {
          const ring = resolveFocusRing(seed, theme);
          const surface = SURFACE_TOKENS[theme];
          expect(wcagContrast(ring, surface)).toBeGreaterThanOrEqual(3);
        },
      ),
    );
  });
});

describe("Property 21: body + large text WCAG contrast", () => {
  it("body pairs clear 4.5:1", () => {
    fc.assert(
      fc.property(fc.constantFrom(...THEME_TOKEN_PAIRS.body), (pair) => {
        expect(wcagContrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(4.5);
      }),
    );
  });

  it("large pairs clear 3:1", () => {
    fc.assert(
      fc.property(fc.constantFrom(...THEME_TOKEN_PAIRS.large), (pair) => {
        expect(wcagContrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(3);
      }),
    );
  });
});
