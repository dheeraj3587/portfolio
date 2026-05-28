/**
 * Motion_Engine — single client module that owns the shared motion vocabulary
 * for the Android-developer redesign.
 *
 * Task 1.1 scope (this file):
 *   - SHARED_SPRING preset + useSharedSpring() (Requirement 1.2).
 *   - motionDurations table consumed by every animated section
 *     (Requirements 2.1, 2.5, 3.4, 3.5, 4.9, 5.2, 6.4, 7.1, 8.2, 9.3,
 *     12.5, 13.2).
 *   - motionVariants constants: containerTransform, sharedAxis,
 *     staggeredReveal(stepMs), bottomSheet.
 *   - Pure helper staggerDelay(stepMs, childIndex) that Property 17 targets
 *     (Requirement 17.1, 2.1, 6.4).
 *
 * Subsequent tasks append to this same file:
 *   - 1.2 → useReducedMotionState, m<T>(tag), gsapTimeline(), __motionEngineSpy.
 *   - 1.3 → useEffectiveConnectionType, rippleDecayMs.
 */

import type { Variants } from "motion/react";

// ---------------------------------------------------------------------------
// Shared spring preset (Requirement 1.2)
// ---------------------------------------------------------------------------

/**
 * The single coherent motion language. Every animated surface in the redesign
 * consumes this preset rather than inlining its own spring so Property 18
 * ("one spring across the page") is provable.
 */
export const SHARED_SPRING = {
  type: "spring",
  stiffness: 280,
  damping: 30,
  mass: 0.9,
} as const;

export type SharedSpring = typeof SHARED_SPRING;

/**
 * Returns a stable reference to the shared spring preset. The reference is
 * module-level so this hook is safe to call during SSR and never triggers a
 * re-render on its own.
 */
export function useSharedSpring(): SharedSpring {
  return SHARED_SPRING;
}

// ---------------------------------------------------------------------------
// Duration table (milliseconds)
// ---------------------------------------------------------------------------

/**
 * Centralised duration budgets, in milliseconds, shared by every animated
 * surface. Each value is wired to a specific acceptance criterion so the
 * property tests can assert exact upper bounds.
 *
 * | key                     | requirement | what it bounds                                              |
 * |-------------------------|-------------|-------------------------------------------------------------|
 * | counterMax              | 2.5         | AnimatedCounter convergence ceiling                         |
 * | cardReveal              | 4.9         | Project_Card rise-and-fade reveal                            |
 * | timelineRail            | 7.1         | Experience_Timeline rail growth                              |
 * | formField               | 8.2         | Contact form field focus / floating-label transition         |
 * | themeCrossfade          | 12.5        | Theme switch crossfade                                       |
 * | containerTransform      | 5.2         | Project_Card → Project_Showcase open                         |
 * | containerTransformAbort | 5.2         | Abort-and-snap deadline (~1 frame past the budget)           |
 * | bootCap                 | 13.2        | App_Boot_Animation hard cap before the FLIP morph            |
 * | reducedMotionHandoff    | 13.5        | Reduced-motion intro handoff                                 |
 * | staggerStepMin          | 2.1         | Lower bound for hero per-element stagger delay               |
 * | staggerStepMax          | 2.1         | Upper bound for hero per-element stagger delay               |
 * | techGridStepMin         | 6.4         | Lower bound for Tech_Stack_Grid per-icon stagger delay       |
 * | techGridStepMax         | 6.4         | Upper bound for Tech_Stack_Grid per-icon stagger delay       |
 */
export const motionDurations = {
  counterMax: 1500,
  cardReveal: 600,
  timelineRail: 1200,
  formField: 250,
  themeCrossfade: 250,
  containerTransform: 600,
  containerTransformAbort: 616,
  bootCap: 1800,
  reducedMotionHandoff: 200,
  staggerStepMin: 40,
  staggerStepMax: 160,
  techGridStepMin: 20,
  techGridStepMax: 80,
} as const;

export type MotionDurations = typeof motionDurations;
export type MotionDurationKey = keyof MotionDurations;

// ---------------------------------------------------------------------------
// staggerDelay — pure helper that Property 17 targets
// ---------------------------------------------------------------------------

/**
 * Returns the per-child reveal delay, in seconds, for a stagger sequence with
 * step `stepMs` (milliseconds) and zero-based `childIndex`.
 *
 * Property 17 (validates Requirements 2.1, 6.4):
 *   For any stepMs ∈ [40, 160] and any childIndex ∈ [0, 7], the result equals
 *   `(stepMs * childIndex) / 1000` and is finite.
 *
 * The function is intentionally pure and operates on plain numbers so the
 * fast-check generators can hammer it without touching React.
 */
export function staggerDelay(stepMs: number, childIndex: number): number {
  return (stepMs * childIndex) / 1000;
}

// ---------------------------------------------------------------------------
// motionVariants — pre-baked variants consumed by sections
// ---------------------------------------------------------------------------

const CONTAINER_TRANSFORM_DURATION_S =
  motionDurations.containerTransform / 1000;
const SHARED_AXIS_DURATION_S = 0.5; // Requirement 3.4 (≤ 500ms)
const BOTTOM_SHEET_DURATION_S = motionDurations.cardReveal / 1000;

/**
 * Container-transform variant for `Project_Showcase` (Requirement 5.2).
 *
 * The actual position/size morph is driven by motion's shared `layoutId`
 * pairing in `ProjectsSection` ↔ `ProjectShowcase`. These variants drive the
 * surface's content fade so the dialog body settles within the 600 ms budget
 * once the layout has docked.
 */
const containerTransform: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      ...SHARED_SPRING,
      duration: CONTAINER_TRANSFORM_DURATION_S,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: CONTAINER_TRANSFORM_DURATION_S * 0.5 },
  },
};

/**
 * Shared-axis variant for the `Device_Showcase` kicker text and any other
 * Compose-flavoured horizontal screen exchange (Requirements 3.3, 3.4).
 * Completes within 500 ms.
 */
const sharedAxis: Variants = {
  initial: { opacity: 0, x: 24 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: SHARED_AXIS_DURATION_S, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    x: -24,
    transition: { duration: SHARED_AXIS_DURATION_S, ease: "easeIn" },
  },
};

/**
 * Parent variant factory for staggered reveals used by the hero
 * (`stepMs ∈ [40, 160]`) and the Tech_Stack_Grid (`stepMs ∈ [20, 80]`).
 *
 * The per-child delay is delegated to motion's `staggerChildren` mechanism;
 * the pure shape `(stepMs * i) / 1000` is exposed via {@link staggerDelay}
 * for Property 17 to assert against without spinning up motion.
 */
function staggeredReveal(stepMs: number): Variants {
  const stepSeconds = stepMs / 1000;
  return {
    initial: { opacity: 0, y: 8 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        ...SHARED_SPRING,
        staggerChildren: stepSeconds,
        delayChildren: 0,
      },
    },
  };
}

/**
 * Bottom-sheet variant used by `Project_Showcase` on viewports < 768 px
 * (Requirement 15.2). Slides in from the bottom of the viewport and uses the
 * shared spring on the way up.
 */
const bottomSheet: Variants = {
  initial: { y: "100%" },
  animate: {
    y: "0%",
    transition: SHARED_SPRING,
  },
  exit: {
    y: "100%",
    transition: { duration: BOTTOM_SHEET_DURATION_S, ease: "easeIn" },
  },
};

export const motionVariants = {
  containerTransform,
  sharedAxis,
  staggeredReveal,
  bottomSheet,
} as const;

export type MotionVariants = typeof motionVariants;

// ---------------------------------------------------------------------------
// Reduced-motion store (Requirements 1.2, 17.1, 19.1)
// ---------------------------------------------------------------------------
//
// Task 1.2 wires three surfaces to a single source of truth for the
// `prefers-reduced-motion: reduce` system query:
//
//   1. `useReducedMotionState()` — React hook backed by `useSyncExternalStore`
//      so every render of every animated section sees the same value on the
//      same tick (Requirement 17.1).
//
//   2. `m<T>(tag)` — wrapper around `motion[tag]` that short-circuits to a
//      plain `<tag>` (animation props stripped) under reduced motion. This
//      is the funnel that lets Property 1 ("reduced motion universally
//      suppresses timelines") observe whether a real motion timeline was
//      ever scheduled (Requirement 19.1).
//
//   3. `gsapTimeline(opts?)` — wrapper around `gsap.timeline()` that returns
//      a chainable no-op stub under reduced motion. The stub mirrors the
//      gsap fluent API surface so callers can `.to(...).from(...).kill()`
//      without crashing (Requirement 13.5, 19.1).
//
// All three read from a module-level cache (`reducedMotionCache`). The hook
// owns the *write* path through `useSyncExternalStore`, but the cache is
// readable from non-React code so the `m()` factory and `gsapTimeline()`
// can short-circuit at component-instantiation time and at render time.

import { createElement, useSyncExternalStore } from "react";
import type { ComponentType, FC, JSX as ReactJSX } from "react";

import { motion as motionFactory } from "motion/react";
import gsap from "gsap";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

let reducedMotionCache = false;
let reducedMotionInitialized = false;
const reducedMotionListeners = new Set<() => void>();

function notifyReducedMotionListeners(): void {
  for (const listener of reducedMotionListeners) listener();
}

function setReducedMotionCache(next: boolean): void {
  if (reducedMotionCache === next) return;
  reducedMotionCache = next;
  notifyReducedMotionListeners();
}

/**
 * Lazily attaches a `change` listener to the `(prefers-reduced-motion: reduce)`
 * media query the first time any consumer needs the cache. SSR-safe: returns
 * immediately when there is no `window`. Idempotent so the listener is only
 * attached once for the lifetime of the module.
 */
function ensureReducedMotionListening(): void {
  if (reducedMotionInitialized) return;
  if (typeof window === "undefined") return;
  if (typeof window.matchMedia !== "function") return;
  reducedMotionInitialized = true;
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  reducedMotionCache = mql.matches;
  const handleChange = (event: MediaQueryListEvent) => {
    setReducedMotionCache(event.matches);
  };
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", handleChange);
  } else {
    // Older Safari: fall back to the deprecated `addListener` shape.
    type LegacyMql = MediaQueryList & {
      addListener?: (
        listener: (event: MediaQueryListEvent) => void,
      ) => void;
    };
    (mql as LegacyMql).addListener?.(handleChange);
  }
}

function getReducedMotionSnapshot(): boolean {
  // Lazily install the matchMedia listener on the very first read so the
  // first React render already sees the live system value. Without this,
  // useSyncExternalStore would return the (uninitialised) cache on its
  // first synchronous getSnapshot call and only pick up the real value
  // after subscribe() runs, causing the `m()` wrapper to take the motion
  // path for one render before flipping to the reduced-motion path.
  ensureReducedMotionListening();
  return reducedMotionCache;
}

function getReducedMotionServerSnapshot(): boolean {
  // SSR always renders the non-reduced state so the server-rendered markup
  // matches the first client render. The post-mount subscribe + getSnapshot
  // pass picks up the real value within one render cycle of hydration
  // (Requirement 17.1's 100ms update-latency clause).
  return false;
}

function subscribeReducedMotion(listener: () => void): () => void {
  ensureReducedMotionListening();
  reducedMotionListeners.add(listener);
  return () => {
    reducedMotionListeners.delete(listener);
  };
}

/**
 * SSR-safe React hook that returns `true` when the user has the
 * `prefers-reduced-motion: reduce` system preference active.
 *
 * The initial server snapshot is always `false` so server-rendered output
 * matches the first client render. After mount, the subscription updates
 * within one media-query change event of a system change.
 */
export function useReducedMotionState(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

// ---------------------------------------------------------------------------
// __motionEngineSpy — test/dev-only call counter (Requirement 19.1)
// ---------------------------------------------------------------------------

/**
 * Test-only spy interface. Production builds export an inert object whose
 * counters are always `0` and whose `reset()` is a no-op so the spy does
 * not survive into the shipped bundle.
 */
export interface MotionEngineSpy {
  readonly motionAnimateCalls: number;
  readonly gsapTimelineCalls: number;
  reset(): void;
}

const isProduction = process.env.NODE_ENV === "production";

const motionEngineSpyMutable: {
  motionAnimateCalls: number;
  gsapTimelineCalls: number;
  reset(): void;
} = {
  motionAnimateCalls: 0,
  gsapTimelineCalls: 0,
  reset() {
    this.motionAnimateCalls = 0;
    this.gsapTimelineCalls = 0;
  },
};

const motionEngineSpyInert: MotionEngineSpy = Object.freeze({
  motionAnimateCalls: 0,
  gsapTimelineCalls: 0,
  reset(): void {
    /* no-op in production */
  },
});

/**
 * Property 1 (reduced motion universally suppresses timelines) imports this
 * spy and asserts both counters stay at `0` while every section renders
 * under `matchMedia('reduce')`. In dev/test the counters increment whenever
 * `m()` takes the motion path or `gsapTimeline()` builds a real timeline.
 * In production the export is an inert frozen object.
 */
export const __motionEngineSpy: MotionEngineSpy = isProduction
  ? motionEngineSpyInert
  : motionEngineSpyMutable;

function incrementMotionAnimateCalls(): void {
  if (!isProduction) motionEngineSpyMutable.motionAnimateCalls += 1;
}

function incrementGsapTimelineCalls(): void {
  if (!isProduction) motionEngineSpyMutable.gsapTimelineCalls += 1;
}

// ---------------------------------------------------------------------------
// m<T>(tag) — motion[tag] wrapper that short-circuits under reduced motion
// ---------------------------------------------------------------------------

/**
 * Props on `motion.*` components that are purely animation directives — they
 * have no meaning on a plain DOM element and would emit a React warning if
 * forwarded. Stripped from the prop bag when `m()` falls back to a static
 * element under reduced motion.
 */
const ANIMATION_ONLY_PROPS: ReadonlySet<string> = new Set<string>([
  "initial",
  "animate",
  "exit",
  "variants",
  "transition",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileDrag",
  "whileInView",
  "drag",
  "dragConstraints",
  "dragControls",
  "dragDirectionLock",
  "dragElastic",
  "dragListener",
  "dragMomentum",
  "dragPropagation",
  "dragSnapToOrigin",
  "dragTransition",
  "layout",
  "layoutId",
  "layoutDependency",
  "layoutScroll",
  "layoutRoot",
  "globalTransition",
  "onAnimationStart",
  "onAnimationComplete",
  "onUpdate",
  "onDrag",
  "onDragStart",
  "onDragEnd",
  "onDirectionLock",
  "onLayoutAnimationStart",
  "onLayoutAnimationComplete",
  "onViewportEnter",
  "onViewportLeave",
  "viewport",
  "transformTemplate",
  "custom",
  "inherit",
]);

function stripAnimationProps(
  props: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (!ANIMATION_ONLY_PROPS.has(key)) out[key] = props[key];
  }
  return out;
}

type MotionFactory = typeof motionFactory;

/**
 * Resolves the motion component type for a given intrinsic JSX tag. Tags
 * that motion does not implement (rare HTML/SVG tags) fall back to a plain
 * intrinsic element type so callers still get a sensible component shape.
 */
type MotionTagComponent<T extends keyof ReactJSX.IntrinsicElements> =
  T extends keyof MotionFactory
    ? MotionFactory[T]
    : ComponentType<ReactJSX.IntrinsicElements[T]>;

const motionWrapperCache = new Map<string, FC<Record<string, unknown>>>();

/**
 * Returns a React component for the given intrinsic tag that:
 *
 *   - Renders `motion[tag]` with all props forwarded when reduced motion is
 *     OFF, incrementing `__motionEngineSpy.motionAnimateCalls` in dev/test.
 *   - Renders a plain `<tag>` (animation-only props stripped, all other
 *     props forwarded) when reduced motion is ON.
 *
 * Wrappers are cached per tag so referential identity is stable across
 * renders. Production builds skip the spy increment entirely.
 *
 * Example:
 *   const MotionDiv = m("div");
 *   <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
 */
export function m<T extends keyof ReactJSX.IntrinsicElements>(
  tag: T,
): MotionTagComponent<T> {
  const tagKey = tag as string;
  const cached = motionWrapperCache.get(tagKey);
  if (cached) return cached as unknown as MotionTagComponent<T>;

  const MotionComponent = (
    motionFactory as unknown as Record<
      string,
      ComponentType<Record<string, unknown>> | undefined
    >
  )[tagKey];

  const Wrapper: FC<Record<string, unknown>> = (props) => {
    const reduced = useReducedMotionState();
    if (reduced) {
      const stripped = stripAnimationProps(props);
      return createElement(tag as string, stripped);
    }
    incrementMotionAnimateCalls();
    if (MotionComponent) {
      return createElement(MotionComponent, props);
    }
    // Fallback for tags motion does not provide — render the plain element
    // and strip animation props so we never warn about unknown DOM props.
    return createElement(tag as string, stripAnimationProps(props));
  };
  Wrapper.displayName = `m(${tagKey})`;
  motionWrapperCache.set(tagKey, Wrapper);
  return Wrapper as unknown as MotionTagComponent<T>;
}

// ---------------------------------------------------------------------------
// gsapTimeline — gsap.timeline wrapper with reduced-motion no-op stub
// ---------------------------------------------------------------------------

type ChainableFn = (...args: unknown[]) => unknown;

/**
 * Builds a chainable no-op stub that satisfies the `gsap.core.Timeline`
 * surface area used by the redesign (and any future caller). Method calls
 * return the stub itself so fluent chains keep working; getter-style
 * accessors return safe zero-ish defaults so callers reading `progress()`,
 * `duration()`, etc. do not crash.
 */
function createNoopGsapTimeline(): gsap.core.Timeline {
  // Safe defaults for the small set of methods that gsap callers commonly
  // read as values rather than chain off of. Anything not enumerated here
  // falls through to the `noop` chainable returned by the Proxy default.
  const valueGetters: Record<string, ChainableFn> = {
    isActive: () => false,
    paused: () => false,
    duration: () => 0,
    totalDuration: () => 0,
    time: () => 0,
    totalTime: () => 0,
    progress: () => 0,
    totalProgress: () => 0,
    iteration: () => 0,
    delay: () => 0,
    timeScale: () => 1,
    repeat: () => 0,
    repeatDelay: () => 0,
    yoyo: () => false,
    startTime: () => 0,
    endTime: () => 0,
    rawTime: () => 0,
    currentLabel: () => "",
    nextLabel: () => "",
    previousLabel: () => "",
    getChildren: () => [],
    labels: () => ({}),
    then: (resolver?: unknown) => {
      if (typeof resolver === "function") {
        try {
          (resolver as (value: gsap.core.Timeline) => void)(stub);
        } catch {
          /* swallow — no-op timeline must never throw */
        }
      }
      return Promise.resolve(stub);
    },
  };

  const stub: gsap.core.Timeline = new Proxy(
    Object.create(null) as Record<string | symbol, unknown>,
    {
      get(_target, prop) {
        if (typeof prop !== "string") return undefined;
        const valueGetter = valueGetters[prop];
        if (valueGetter) return valueGetter;
        // Default: chainable method returning the stub itself so any
        // unrecognised gsap method call (.to, .from, .fromTo, .set, .add,
        // .kill, .play, .pause, .eventCallback, …) keeps the chain alive.
        return () => stub;
      },
      has() {
        // Pretend every method exists so `"to" in tl` style guards pass.
        return true;
      },
    },
  ) as unknown as gsap.core.Timeline;

  return stub;
}

/**
 * Returns a real `gsap.timeline(opts)` when reduced motion is OFF, and a
 * chainable no-op stub when reduced motion is ON. Increments
 * `__motionEngineSpy.gsapTimelineCalls` in dev/test only when the real
 * timeline path is taken.
 *
 * Callers must use this wrapper instead of `gsap.timeline()` directly so
 * Property 1 can prove that no gsap timeline is ever scheduled while the
 * user has reduced motion enabled (Requirement 19.1).
 */
export function gsapTimeline(
  opts?: gsap.TimelineVars,
): gsap.core.Timeline {
  ensureReducedMotionListening();
  if (reducedMotionCache) {
    return createNoopGsapTimeline();
  }
  incrementGsapTimelineCalls();
  return gsap.timeline(opts);
}

// ---------------------------------------------------------------------------
// Effective connection type (Requirements 1.4, 16.6)
// ---------------------------------------------------------------------------
//
// Task 1.3 wires two consumers — the Material ripple primitive and Property 16
// — to a single source of truth for `navigator.connection.effectiveType`:
//
//   1. `useEffectiveConnectionType()` — React hook backed by
//      `useSyncExternalStore` so every component sees the same connection
//      snapshot on a given tick. SSR returns `"unknown"` so server-rendered
//      output never assumes a network class. The first client commit reads
//      `navigator.connection?.effectiveType` directly, falling back to
//      `"4g"` when the Network Information API is unavailable (Safari,
//      Firefox). A `change` listener on `navigator.connection` keeps the
//      cache live for the lifetime of the page (Requirement 16.6's
//      "react to system changes within one event loop" clause).
//
//   2. `rippleDecayMs(effectiveType)` — pure helper consumed by both the
//      Ripple component (Requirement 1.4: 800ms decay on 2g/3g, 600ms
//      otherwise) and Property 16, which hammers the helper directly with
//      fast-check generators without touching React.

/**
 * The narrow set of `effectiveType` values exposed by the Network Information
 * API plus an explicit `"unknown"` for SSR / unsupported browsers. The full
 * value set lets consumers exhaustively switch on the connection class
 * without resorting to a string fallback default.
 */
export type EffectiveConnectionType =
  | "slow-2g"
  | "2g"
  | "3g"
  | "4g"
  | "unknown";

/**
 * The non-standard shape exposed by Chromium-based browsers on
 * `navigator.connection`. Typed locally so the engine compiles without a
 * `lib.dom` Network Information augmentation.
 */
type NavigatorWithConnection = Navigator & {
  connection?: {
    effectiveType?: EffectiveConnectionType;
    addEventListener?: (type: "change", listener: () => void) => void;
    removeEventListener?: (type: "change", listener: () => void) => void;
    // Pre-EventTarget API kept around for older Chromium / vendor shims.
    addListener?: (listener: () => void) => void;
    removeListener?: (listener: () => void) => void;
  };
};

const VALID_EFFECTIVE_TYPES: ReadonlySet<EffectiveConnectionType> = new Set<
  EffectiveConnectionType
>(["slow-2g", "2g", "3g", "4g", "unknown"]);

let effectiveConnectionCache: EffectiveConnectionType = "unknown";
let effectiveConnectionInitialized = false;
const effectiveConnectionListeners = new Set<() => void>();

function notifyEffectiveConnectionListeners(): void {
  for (const listener of effectiveConnectionListeners) listener();
}

function readNavigatorEffectiveType(): EffectiveConnectionType {
  if (typeof navigator === "undefined") return "unknown";
  const conn = (navigator as NavigatorWithConnection).connection;
  const raw = conn?.effectiveType;
  if (raw && VALID_EFFECTIVE_TYPES.has(raw)) return raw;
  // Network Information API absent or returned a value outside the spec's
  // enum — fall back to `"4g"` per design.md §Motion_Engine so consumers
  // get the fast path on browsers that do not implement the API.
  return "4g";
}

function setEffectiveConnectionCache(next: EffectiveConnectionType): void {
  if (effectiveConnectionCache === next) return;
  effectiveConnectionCache = next;
  notifyEffectiveConnectionListeners();
}

/**
 * Lazily attaches a `change` listener to `navigator.connection` the first
 * time any consumer reads the cache. SSR-safe: returns immediately when
 * there is no `navigator`. Idempotent so the listener is only attached once
 * per module lifetime.
 */
function ensureEffectiveConnectionListening(): void {
  if (effectiveConnectionInitialized) return;
  if (typeof navigator === "undefined") return;
  effectiveConnectionInitialized = true;
  effectiveConnectionCache = readNavigatorEffectiveType();
  const conn = (navigator as NavigatorWithConnection).connection;
  if (!conn) return;
  const handleChange = (): void => {
    setEffectiveConnectionCache(readNavigatorEffectiveType());
  };
  if (typeof conn.addEventListener === "function") {
    conn.addEventListener("change", handleChange);
  } else if (typeof conn.addListener === "function") {
    // Older Chromium shape: `addListener(cb)` with no event name.
    conn.addListener(handleChange);
  }
}

function getEffectiveConnectionSnapshot(): EffectiveConnectionType {
  ensureEffectiveConnectionListening();
  return effectiveConnectionCache;
}

function getEffectiveConnectionServerSnapshot(): EffectiveConnectionType {
  // SSR has no network telemetry — surface `"unknown"` so server markup
  // never picks a slow-connection branch the client might disagree with.
  return "unknown";
}

function subscribeEffectiveConnection(listener: () => void): () => void {
  ensureEffectiveConnectionListening();
  effectiveConnectionListeners.add(listener);
  return () => {
    effectiveConnectionListeners.delete(listener);
  };
}

/**
 * SSR-safe React hook that returns the live `navigator.connection.effectiveType`
 * value, normalised to {@link EffectiveConnectionType}.
 *
 * Server snapshot is `"unknown"`. The first client commit reads the live
 * value (or `"4g"` when the Network Information API is unavailable). The
 * subscription updates within one `change` event of a system change so the
 * ripple primitive's decay duration and any slow-connection fallbacks stay
 * in sync (Requirements 1.4, 16.6).
 */
export function useEffectiveConnectionType(): EffectiveConnectionType {
  return useSyncExternalStore(
    subscribeEffectiveConnection,
    getEffectiveConnectionSnapshot,
    getEffectiveConnectionServerSnapshot,
  );
}

/**
 * Pure helper: returns the Material ripple decay duration, in milliseconds,
 * for a given effective connection type.
 *
 * Property 16 (validates Requirement 1.4):
 *   For any `effectiveType` ∈ {"slow-2g", "2g", "3g", "4g"}, the helper
 *   SHALL return `800` when `effectiveType ∈ {"2g", "3g"}` and SHALL
 *   return `600` otherwise. `"unknown"` (SSR / unsupported browsers) is
 *   treated as the fast path and returns `600`.
 */
export function rippleDecayMs(
  effectiveType: EffectiveConnectionType,
): 600 | 800 {
  return effectiveType === "2g" || effectiveType === "3g" ? 800 : 600;
}
