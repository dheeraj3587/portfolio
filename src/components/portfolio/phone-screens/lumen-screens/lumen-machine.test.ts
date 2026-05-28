import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  lumenReducer,
  initialLumenState,
  type LumenState,
  type LumenEvent,
} from "./lumen-machine";

// Feature: mobile-app-project-showcase, Property 6: SUBMIT with non-empty input advances to results carrying the trimmed prompt
describe("lumenReducer SUBMIT path (Property 6)", () => {
  it("TYPE(s) → SUBMIT → LOAD_COMPLETE ends in results with trimmed prompt for any non-empty-trimmed s", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        (s: string) => {
          const afterType: LumenState = lumenReducer(initialLumenState, {
            type: "TYPE",
            value: s,
          });

          const afterSubmit: LumenState = lumenReducer(afterType, { type: "SUBMIT" });
          // Intermediate state after SUBMIT must be loading.
          expect(afterSubmit.phase).toBe("loading");

          const afterLoad: LumenState = lumenReducer(afterSubmit, { type: "LOAD_COMPLETE" });
          expect(afterLoad.phase).toBe("results");
          expect(afterLoad.submittedPrompt).toBe(s.trim());
          expect(afterLoad.hasAdvancedFromHome).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Helpers for Property 7 (defined at module scope so fast-check can reuse the
// arbitraries across runs without rebuilding them on every iteration).

// Arbitrary over LumenEvent values used to build reachable states by folding
// a random sequence of events from `initialLumenState`.
const eventArb: fc.Arbitrary<LumenEvent> = fc.oneof(
  fc.string().map((value) => ({ type: "TYPE" as const, value })),
  fc.constant({ type: "SUBMIT" as const }),
  fc.constant({ type: "LOAD_COMPLETE" as const }),
  fc.constant({ type: "AUTO_ADVANCE" as const }),
  fc.constant({ type: "NAV_TO_HOME" as const }),
  fc.constant({ type: "NAV_TO_RESULTS" as const }),
  fc.constant({ type: "RESET" as const }),
);

// Reachable states are those produced by replaying a finite event sequence
// from `initialLumenState`. We filter out `loading` reachable states because
// the reducer's "loading × any → unchanged" rule means TYPE/SUBMIT are no-ops
// from `loading`, which would trivially leave `phase === "loading"` and is
// outside the scope of Property 7 (which targets the empty-input guard, not
// the loading-freeze rule).
const reachableNonLoadingState: fc.Arbitrary<LumenState> = fc
  .array(eventArb, { maxLength: 10 })
  .map((events) => events.reduce(lumenReducer, initialLumenState))
  .filter((state) => state.phase !== "loading");

// Whitespace-only strings (including the empty string) — these MUST never be
// submittable per Req 5.6.
const whitespaceArb = fc.string({
  unit: fc.constantFrom(" ", "\t", "\n", ""),
});

// Feature: mobile-app-project-showcase, Property 7: Empty or whitespace-only input never advances the phase
describe("lumenReducer empty-input guard (Property 7)", () => {
  it("TYPE(whitespace) → SUBMIT keeps phase ∈ {idle, results} and submittedPrompt unchanged", () => {
    fc.assert(
      fc.property(reachableNonLoadingState, whitespaceArb, (state, ws) => {
        const submittedPromptBefore = state.submittedPrompt;

        const afterType: LumenState = lumenReducer(state, {
          type: "TYPE",
          value: ws,
        });
        const afterSubmit: LumenState = lumenReducer(afterType, {
          type: "SUBMIT",
        });

        // SUBMIT MUST NOT advance to loading from an empty/whitespace input.
        expect(afterSubmit.phase).not.toBe("loading");
        expect(["idle", "results"]).toContain(afterSubmit.phase);
        // TYPE never mutates submittedPrompt and SUBMIT with empty input is a
        // no-op, so submittedPrompt must equal the original reachable state's.
        expect(afterSubmit.submittedPrompt).toBe(submittedPromptBefore);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: mobile-app-project-showcase, Property 5: lumenReducer is total
describe("lumenReducer (Property 5)", () => {
  // Reachable states across the full state space (ALL phases, including
  // loading). Property 5 asserts totality everywhere, so unlike Property 7
  // we deliberately do NOT filter out the loading phase here.
  const reachableState: fc.Arbitrary<LumenState> = fc
    .array(eventArb, { maxLength: 20 })
    .map((events) => events.reduce(lumenReducer, initialLumenState));

  it("returns a valid LumenState for every (reachable state, event) pair without throwing", () => {
    fc.assert(
      fc.property(reachableState, eventArb, (state: LumenState, event: LumenEvent) => {
        // The reducer must never throw, regardless of (state, event) pair.
        let next: LumenState | undefined;
        expect(() => {
          next = lumenReducer(state, event);
        }).not.toThrow();

        // Must never return undefined / null.
        expect(next).toBeDefined();
        expect(next).not.toBeNull();

        const result = next as LumenState;

        // phase ∈ the declared union.
        expect(["idle", "composing", "loading", "results"]).toContain(result.phase);

        // input is always a string.
        expect(typeof result.input).toBe("string");

        // submittedPrompt is either null or a string.
        expect(
          result.submittedPrompt === null ||
            typeof result.submittedPrompt === "string",
        ).toBe(true);

        // hasAdvancedFromHome is always a boolean.
        expect(typeof result.hasAdvancedFromHome).toBe("boolean");
      }),
      { numRuns: 100 },
    );
  });
});
