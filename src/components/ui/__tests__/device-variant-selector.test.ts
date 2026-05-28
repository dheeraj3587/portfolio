import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { selectDeviceVariant } from "@/lib/device-variant";

/**
 * Property 6: `selectDeviceVariant` total purity.
 *
 * Validates: Requirements 4.3, 19.8
 *
 * Per design §C.3 (`Device_Variant_Selector`), the selector is a total,
 * pure function over `{ id?: string, device?: "android" | "ios" }`:
 *
 *   1. Return value is always in `{"android", "ios"}` (totality).
 *   2. Same input always yields the same output (purity / referential
 *      transparency).
 *   3. When `device` is undefined and `id !== "lumen"`, the result defaults
 *      to `"android"` (Requirement 4.3 — Android-default fallback).
 *   4. When `device === "ios"`, the result is `"ios"` (explicit override).
 *   5. When `device === "android"`, the result is `"android"`.
 *   6. When `id === "lumen"` and `device` is undefined, the result is
 *      `"ios"` (hard-coded design exception per §C.3).
 */
describe("Property 6: selectDeviceVariant total purity", () => {
  // Generator described by the task spec: arbitrary id strings paired with
  // an optional device discriminant. `fc.option(..., { nil: undefined })`
  // models the missing-`device` case as a literal `undefined`, which is
  // what real `Project` records look like before the per-project override
  // is set.
  const projectArb = fc.record({
    id: fc.string(),
    device: fc.option(
      fc.constantFrom<"android" | "ios">("android", "ios"),
      { nil: undefined },
    ),
  });

  it("always returns 'android' or 'ios' (totality)", () => {
    fc.assert(
      fc.property(projectArb, (p) => {
        const v = selectDeviceVariant(p);
        expect(v === "android" || v === "ios").toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("is pure: repeated calls with the same input return the same value", () => {
    fc.assert(
      fc.property(projectArb, (p) => {
        // Two consecutive calls must agree. Because the function is pure,
        // we can also assert that any number of repeated calls collapse to
        // a single value.
        const a = selectDeviceVariant(p);
        const b = selectDeviceVariant(p);
        const c = selectDeviceVariant(p);
        expect(a).toBe(b);
        expect(b).toBe(c);
      }),
      { numRuns: 200 },
    );
  });

  it("defaults to 'android' when device is undefined and id is not 'lumen' (Requirement 4.3)", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s !== "lumen"),
        (id) => {
          expect(selectDeviceVariant({ id, device: undefined })).toBe(
            "android",
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it("returns 'ios' whenever device === 'ios' regardless of id", () => {
    fc.assert(
      fc.property(fc.string(), (id) => {
        expect(selectDeviceVariant({ id, device: "ios" })).toBe("ios");
      }),
      { numRuns: 200 },
    );
  });

  it("returns 'android' whenever device === 'android' regardless of id", () => {
    fc.assert(
      fc.property(fc.string(), (id) => {
        expect(selectDeviceVariant({ id, device: "android" })).toBe(
          "android",
        );
      }),
      { numRuns: 200 },
    );
  });

  it("returns 'ios' when id === 'lumen' and device is undefined (design §C.3 hard-coded fallback)", () => {
    expect(selectDeviceVariant({ id: "lumen", device: undefined })).toBe(
      "ios",
    );
  });
});
