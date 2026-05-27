import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  computeSideButtonGeometry,
  resolveScreenBackground,
  resolveStatusBarTint,
  tryParseHexOrRgb,
  type SideButtonGeometry,
} from "./iphone-frame.helpers";

// Six-character lowercase hex string generator. The design's task spec calls
// for `fc.hexaString({ minLength: 6, maxLength: 6 })`, but `hexaString` was
// removed in fast-check v4; we keep the spirit (uniform 6-char hex strings)
// using v4's `string` arbitrary with an explicit unit.
const hex6 = fc.string({
  unit: fc.constantFrom(
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
  ),
  minLength: 6,
  maxLength: 6,
});

describe("resolveStatusBarTint — auto-tint contrast (Property 2)", () => {
  // Property 2: Status-bar tint contrasts the screen background under `auto`.
  // Validates: Requirements 4.1, 4.2
  it("returns the tint that contrasts the resolved background's luminance when statusBarTint === 'auto'", () => {
    fc.assert(
      fc.property(
        fc.tuple(hex6, fc.constantFrom<"light" | "dark">("light", "dark")),
        ([hex, scheme]) => {
          const background = resolveScreenBackground("#" + hex, scheme);
          const tint = resolveStatusBarTint("auto", scheme, background);

          // Luminance is always in [0, 1] for parsable hex inputs.
          expect(background.luminance).toBeGreaterThanOrEqual(0);
          expect(background.luminance).toBeLessThanOrEqual(1);

          if (background.luminance >= 0.5) {
            // Light surface → dark text (Requirement 4.1).
            expect(tint).toBe("#0a0a0b");
          } else {
            // Dark surface → light text (Requirement 4.2).
            expect(tint).toBe("#f4f4f5");
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("resolveScreenBackground — backwards-compatible defaults (Property 3)", () => {
  // Property 3: For any call site that does not pass `screenBackground`,
  // the rendered screen background equals `#ffffff` when
  // `screenColorScheme === "light"` and `#0a0a0b` when `=== "dark"`,
  // and the resolver still returns a usable luminance for tint resolution.
  // Validates: Requirements 3.1, 3.2, 3.3
  it("returns the legacy default value/luminance pair when screenBackground is omitted", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<"light" | "dark">("light", "dark"),
        (scheme) => {
          const resolved = resolveScreenBackground(undefined, scheme);

          if (scheme === "light") {
            // Requirement 3.1: light scheme defaults to #ffffff.
            expect(resolved.value).toBe("#ffffff");
            // White's WCAG relative luminance is exactly 1.0.
            expect(resolved.luminance).toBe(1.0);
          } else {
            // Requirement 3.2: dark scheme defaults to #0a0a0b.
            expect(resolved.value).toBe("#0a0a0b");
            // The near-black #0a0a0b uses the design's documented
            // fallback luminance of 0.04 so auto-tint resolves to light.
            expect(resolved.luminance).toBe(0.04);
          }

          // Requirement 3.3: the resolver always returns a usable value
          // even without an explicit `screenBackground`, so descendants
          // reading `--device-screen-bg` see a concrete colour.
          expect(typeof resolved.value).toBe("string");
          expect(resolved.value.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("computeSideButtonGeometry — visible side buttons (Property 4)", () => {
  // Property 4: For any `width` in `[200, 600]` px, every rail returned by
  // `computeSideButtonGeometry(width)` has `thickness >= 5 px` and
  // `inset >= 1 px`, and the five buttons are placed at the iOS-correct
  // positions defined in the geometry table.
  // Validates: Requirements 2.1, 2.2
  it("returns the iOS-correct geometry for any supported frame width", () => {
    // The expected button table is taken verbatim from the design's
    // side-button geometry table, in DOM order.
    const expected: ReadonlyArray<SideButtonGeometry> = [
      { side: "left", topPct: 13.5, lengthPct: 6.5, role: "action" },
      { side: "left", topPct: 21.0, lengthPct: 10.0, role: "volumeUp" },
      { side: "left", topPct: 32.0, lengthPct: 10.0, role: "volumeDown" },
      { side: "right", topPct: 22.0, lengthPct: 14.0, role: "side" },
      { side: "right", topPct: 39.0, lengthPct: 6.5, role: "cameraControl" },
    ];

    fc.assert(
      fc.property(fc.integer({ min: 200, max: 600 }), (width) => {
        const geometry = computeSideButtonGeometry(width);

        // Requirement 2.1: visible thickness and outward inset.
        expect(geometry.thickness).toBeGreaterThanOrEqual(5);
        expect(geometry.inset).toBeGreaterThanOrEqual(1);

        // Five buttons returned in DOM order.
        expect(geometry.buttons.length).toBe(5);

        // Requirement 2.2: each entry's side, topPct, lengthPct, and role
        // matches the design's geometry table verbatim.
        for (let i = 0; i < expected.length; i++) {
          const actual = geometry.buttons[i];
          const want = expected[i];
          expect(actual.side).toBe(want.side);
          expect(actual.topPct).toBe(want.topPct);
          expect(actual.lengthPct).toBe(want.lengthPct);
          expect(actual.role).toBe(want.role);
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe("tryParseHexOrRgb — edge cases", () => {
  // Validates: Requirement 4.5

  describe("parsable inputs (return non-null rgb)", () => {
    it("parses #fff (3-digit hex) by expanding each nibble", () => {
      expect(tryParseHexOrRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    });

    it("parses #FFFFFF (uppercase 6-digit hex)", () => {
      expect(tryParseHexOrRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
    });

    it("parses rgb(10, 20, 30)", () => {
      expect(tryParseHexOrRgb("rgb(10, 20, 30)")).toEqual({
        r: 10,
        g: 20,
        b: 30,
      });
    });

    it("parses rgba(10, 20, 30, 0.5) and ignores the alpha channel", () => {
      expect(tryParseHexOrRgb("rgba(10, 20, 30, 0.5)")).toEqual({
        r: 10,
        g: 20,
        b: 30,
      });
    });

    it("tolerates surrounding whitespace around hex input", () => {
      expect(tryParseHexOrRgb("  #abc  ")).toEqual({
        r: 0xaa,
        g: 0xbb,
        b: 0xcc,
      });
    });
  });

  describe("non-parsable inputs (return null)", () => {
    const nonParsableInputs: ReadonlyArray<string> = [
      "linear-gradient(to right, #000, #fff)",
      "oklch(0.5 0.1 200)",
      "red",
      "var(--whatever)",
      "",
      "not a color",
    ];

    it.each(nonParsableInputs)(
      "returns null for %j",
      (input) => {
        expect(tryParseHexOrRgb(input)).toBeNull();
      },
    );

    it.each(nonParsableInputs)(
      "resolveScreenBackground(%j, 'light').luminance === 1.0",
      (input) => {
        expect(resolveScreenBackground(input, "light").luminance).toBe(1.0);
      },
    );

    it.each(nonParsableInputs)(
      "resolveScreenBackground(%j, 'dark').luminance === 0.04",
      (input) => {
        expect(resolveScreenBackground(input, "dark").luminance).toBe(0.04);
      },
    );
  });
});
