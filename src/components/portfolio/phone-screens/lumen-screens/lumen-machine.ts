// Pure state machine for the Lumen project showcase.
//
// Framework-agnostic (no React, no DOM, no I/O, no Date.now / Math.random)
// so it can be exhaustively covered by fast-check property tests.
//
// Consumed by `lumen-context.tsx` via `useReducer(lumenReducer, initialLumenState)`.
//
// Requirements: 5.3, 5.4, 5.5, 5.6, 3.7

/**
 * Default prompt rendered into the `Prompt_Chip` when the auto-advance timer
 * fires before the user has typed anything (Req 3.7, 4.2).
 */
export const DEFAULT_PROMPT = "Inspiration for motion fashion photography";

export type LumenPhase = "idle" | "composing" | "loading" | "results";

export type LumenState = {
  phase: LumenPhase;
  /** Live text in the input bar (any phase). */
  input: string;
  /** Last successfully submitted prompt — drives the prompt chip on Results. */
  submittedPrompt: string | null;
  /** True once the first user-driven submit OR auto-advance has fired. */
  hasAdvancedFromHome: boolean;
};

export type LumenEvent =
  | { type: "TYPE"; value: string }
  | { type: "SUBMIT" }
  | { type: "LOAD_COMPLETE" }
  | { type: "AUTO_ADVANCE" }
  | { type: "NAV_TO_HOME" }
  | { type: "NAV_TO_RESULTS" }
  | { type: "RESET" };

export const initialLumenState: LumenState = {
  phase: "idle",
  input: "",
  submittedPrompt: null,
  hasAdvancedFromHome: false,
};

/**
 * Pure helper used by tests and by the input-bar / reducer guards.
 *
 * Req 5.6: empty / whitespace-only input is not submittable, so `SUBMIT`
 * with such input is a no-op.
 */
export function isInputSubmittable(input: string): boolean {
  return input.trim().length > 0;
}

/**
 * Total, pure, idempotent reducer.
 *
 * - Total: every (state, event) pair returns a valid `LumenState`.
 * - Pure: no `Date.now`, no `Math.random`, no I/O.
 * - Idempotent on no-ops: returns the SAME reference (`state`) when nothing
 *   changes, so React's `useReducer` skips re-renders.
 *
 * The transition table is implemented verbatim from the design doc.
 */
export function lumenReducer(state: LumenState, event: LumenEvent): LumenState {
  switch (event.type) {
    case "TYPE": {
      // loading × TYPE: unchanged (table: "loading | any other | loading | unchanged").
      if (state.phase === "loading") return state;

      const trimmed = event.value.trim();
      const isNonEmpty = trimmed.length > 0;

      // Per the table, empty-after-trim normalises `input` to "" (not the raw
      // whitespace), and non-empty stores the raw `value` so the input field
      // can render the user's typed characters verbatim.
      const nextInput = isNonEmpty ? event.value : "";
      const nextPhase: LumenPhase = isNonEmpty
        ? // non-empty input: composing (idle | composing | results all go to
          //   composing — typing pulls the user back to the composing state).
          "composing"
        : // empty input: idle×TYPE-empty → idle, composing×TYPE-empty → idle,
          //   results×TYPE-empty → results.
          state.phase === "results"
          ? "results"
          : "idle";

      if (state.phase === nextPhase && state.input === nextInput) {
        return state;
      }
      return { ...state, phase: nextPhase, input: nextInput };
    }

    case "SUBMIT": {
      // Empty / whitespace-only submit is a no-op in every phase (Req 5.6).
      if (!isInputSubmittable(state.input)) return state;

      // loading × SUBMIT: unchanged (table: "loading | any other | loading | unchanged").
      if (state.phase === "loading") return state;

      // composing × SUBMIT or results × SUBMIT with non-empty input → loading.
      // idle × SUBMIT cannot reach this branch because input is empty in idle
      // (TYPE with non-empty value moves us to composing first), but if a
      // direct SUBMIT did somehow arrive at idle with non-empty input we
      // still treat it as a valid transition for totality.
      return {
        phase: "loading",
        input: state.input,
        submittedPrompt: state.input.trim(),
        hasAdvancedFromHome: true,
      };
    }

    case "LOAD_COMPLETE": {
      // Only meaningful in loading. Other phases are no-ops.
      if (state.phase !== "loading") return state;
      return {
        phase: "results",
        input: "",
        submittedPrompt: state.submittedPrompt,
        hasAdvancedFromHome: state.hasAdvancedFromHome,
      };
    }

    case "AUTO_ADVANCE": {
      // Only fires from idle, and only the first time.
      if (state.phase !== "idle") return state;
      if (state.hasAdvancedFromHome) return state;
      return {
        phase: "loading",
        input: state.input,
        submittedPrompt: DEFAULT_PROMPT,
        hasAdvancedFromHome: true,
      };
    }

    case "NAV_TO_HOME": {
      // Only meaningful when leaving results. From idle/composing we're
      // already on Home. From loading we leave the transition in flight.
      if (state.phase !== "results") return state;
      const nextPhase: LumenPhase = isInputSubmittable(state.input)
        ? "composing"
        : "idle";
      return { ...state, phase: nextPhase };
    }

    case "NAV_TO_RESULTS": {
      // Only allowed if a prompt has been submitted (state diagram).
      if (state.submittedPrompt === null) return state;
      // No-op when already on results or mid-transition.
      if (state.phase === "results" || state.phase === "loading") return state;
      return { ...state, phase: "results" };
    }

    case "RESET": {
      // Return the existing reference if state is already the initial state,
      // so the no-op invariant is preserved even for RESET.
      if (
        state.phase === initialLumenState.phase &&
        state.input === initialLumenState.input &&
        state.submittedPrompt === initialLumenState.submittedPrompt &&
        state.hasAdvancedFromHome === initialLumenState.hasAdvancedFromHome
      ) {
        return state;
      }
      return initialLumenState;
    }

    default: {
      // Exhaustiveness check: any future event type added to `LumenEvent`
      // without a case here will fail this assignment at compile time.
      const _exhaustive: never = event;
      void _exhaustive;
      return state;
    }
  }
}
