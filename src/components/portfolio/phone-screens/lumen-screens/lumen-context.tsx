"use client";

// React provider that owns the Lumen state machine, schedules the
// auto-advance and loading timers, and keeps the `ProjectShowcase`
// `screenIndex` carousel in sync with `state.phase`.
//
// The reducer (`./lumen-machine`) is pure; this file is the only
// place that touches React, timers, or randomness.
//
// Requirements: 3.7, 5.3, 5.4, 5.5, 8.5, 8.6

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

import { TIMING } from "./lumen-data";
import {
  initialLumenState,
  lumenReducer,
  type LumenState,
} from "./lumen-machine";

/**
 * Minimal scheduler surface used by the provider. Keeps the type
 * intentionally narrow (handler + delay → opaque id) so test seams can
 * swap in a fake clock without re-implementing every browser overload,
 * and so the id type doesn't bleed Node's `Timeout` shape into call sites.
 */
export type LumenScheduler = {
  setTimeout: (handler: () => void, timeout: number) => number;
  clearTimeout: (id: number) => void;
};

export type LumenContextValue = {
  state: LumenState;
  setInput: (value: string) => void;
  submit: () => void;
  navigateToHome: () => void;
  navigateToResults: () => void;
  reset: () => void;
  /** Called when the hero-orb video finishes its first play-through. */
  autoAdvance: () => void;
};

export type LumenProviderProps = {
  children: ReactNode;
  /** Externally controlled carousel index from `ProjectShowcase`. */
  screenIndex: number;
  setScreenIndex: (index: number) => void;
  /** Test seams. */
  randomSource?: () => number;
  scheduler?: LumenScheduler;
};

const LumenContext = createContext<LumenContextValue | null>(null);

/**
 * Default scheduler — wraps `globalThis.setTimeout` /
 * `globalThis.clearTimeout` so the module is safe to evaluate during
 * SSR (where `window` is undefined). Effects only fire on the client,
 * so the actual call sites are always in a browser context. The
 * narrow wrapper hides the `NodeJS.Timeout` vs `number` lib mismatch.
 */
const DEFAULT_SCHEDULER: LumenScheduler = {
  setTimeout: (handler, timeout) =>
    globalThis.setTimeout(handler, timeout) as unknown as number,
  clearTimeout: (id) => {
    globalThis.clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
  },
};

/**
 * Inclusive-low / exclusive-high random integer in `[min, max)`.
 * Pure with respect to `random`, which lets tests inject a deterministic
 * sequence.
 */
function randIn(min: number, max: number, random: () => number): number {
  return Math.floor(min + random() * (max - min));
}

export function LumenProvider({
  children,
  screenIndex,
  setScreenIndex,
  randomSource,
  scheduler,
}: LumenProviderProps) {
  const [state, dispatch] = useReducer(lumenReducer, initialLumenState);

  // Latest-prop refs so timers / sync effects don't re-run when callers
  // pass fresh `randomSource` / `scheduler` references each render.
  const randomRef = useRef<() => number>(randomSource ?? Math.random);
  const schedulerRef = useRef<LumenScheduler>(scheduler ?? DEFAULT_SCHEDULER);
  useEffect(() => {
    randomRef.current = randomSource ?? Math.random;
  }, [randomSource]);
  useEffect(() => {
    schedulerRef.current = scheduler ?? DEFAULT_SCHEDULER;
  }, [scheduler]);

  // Track timer ids so cleanup can clear pending dispatches.
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const loadingTimerRef = useRef<number | null>(null);

  // Safety-net AUTO_ADVANCE timer — only fires if the hero-orb video never
  // signals end-of-play (e.g. autoplay was blocked, decode error, reduced
  // motion). The orb's `onEnded` callback (`autoAdvance` below) is the
  // primary trigger so the transition lines up exactly with the animation
  // finishing instead of cutting it off mid-loop.
  useEffect(() => {
    autoAdvanceTimerRef.current = schedulerRef.current.setTimeout(() => {
      dispatch({ type: "AUTO_ADVANCE" });
      autoAdvanceTimerRef.current = null;
    }, TIMING.AUTO_ADVANCE_FALLBACK_MS);

    return () => {
      if (autoAdvanceTimerRef.current !== null) {
        schedulerRef.current.clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
    // Mount-only on purpose; the ref-captured scheduler is stable.
  }, []);

  // Loading → results timer (Req 5.5).
  // Schedules `LOAD_COMPLETE` whenever phase enters `loading`; cleans up
  // on phase change or unmount.
  useEffect(() => {
    if (state.phase !== "loading") {
      if (loadingTimerRef.current !== null) {
        schedulerRef.current.clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      return;
    }
    const delay = randIn(
      TIMING.LOADING_MIN_MS,
      TIMING.LOADING_MAX_MS,
      randomRef.current,
    );
    loadingTimerRef.current = schedulerRef.current.setTimeout(() => {
      dispatch({ type: "LOAD_COMPLETE" });
      loadingTimerRef.current = null;
    }, delay);

    return () => {
      if (loadingTimerRef.current !== null) {
        schedulerRef.current.clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, [state.phase]);

  // Bidirectional carousel sync — refs detect real changes so each
  // effect only acts on its own dimension and we avoid feedback loops.
  const prevPhaseRef = useRef(state.phase);
  const prevScreenIndexRef = useRef(screenIndex);

  // (1) phase → screenIndex push (Req 5.3, 5.4, 5.5).
  useEffect(() => {
    if (prevPhaseRef.current === state.phase) return;
    prevPhaseRef.current = state.phase;
    const desired = state.phase === "results" ? 1 : 0;
    if (desired !== screenIndex) {
      setScreenIndex(desired);
    }
  }, [state.phase, screenIndex, setScreenIndex]);

  // (2) screenIndex → reducer pull (Req 8.5, 8.6).
  // Only dispatch when phase doesn't already match the new index, so
  // the phase-pushed setScreenIndex above can't re-enter the reducer.
  useEffect(() => {
    if (prevScreenIndexRef.current === screenIndex) return;
    prevScreenIndexRef.current = screenIndex;

    if (screenIndex === 0 && state.phase === "results") {
      dispatch({ type: "NAV_TO_HOME" });
    } else if (
      screenIndex === 1 &&
      state.phase !== "results" &&
      state.phase !== "loading"
    ) {
      dispatch({ type: "NAV_TO_RESULTS" });
    }
  }, [screenIndex, state.phase]);

  const setInput = useCallback((value: string) => {
    dispatch({ type: "TYPE", value });
  }, []);
  const submit = useCallback(() => {
    dispatch({ type: "SUBMIT" });
  }, []);
  const navigateToHome = useCallback(() => {
    dispatch({ type: "NAV_TO_HOME" });
  }, []);
  const navigateToResults = useCallback(() => {
    dispatch({ type: "NAV_TO_RESULTS" });
  }, []);
  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);
  const autoAdvance = useCallback(() => {
    dispatch({ type: "AUTO_ADVANCE" });
  }, []);

  const value = useMemo<LumenContextValue>(
    () => ({
      state,
      setInput,
      submit,
      navigateToHome,
      navigateToResults,
      reset,
      autoAdvance,
    }),
    [
      state,
      setInput,
      submit,
      navigateToHome,
      navigateToResults,
      reset,
      autoAdvance,
    ],
  );

  return <LumenContext.Provider value={value}>{children}</LumenContext.Provider>;
}

export function useLumen(): LumenContextValue {
  const ctx = useContext(LumenContext);
  if (ctx === null) {
    throw new Error("useLumen must be used inside <LumenProvider>");
  }
  return ctx;
}
