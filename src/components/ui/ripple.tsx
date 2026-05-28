"use client";

/**
 * Material press-ripple primitive (Task 2.1).
 *
 * Exports:
 *   - {@link computeRippleRadius} — pure helper: diagonal of (width, height).
 *     Property 10 (Requirement 1.4) targets this directly so it never has to
 *     spin up React or `motion`.
 *   - {@link Ripple} — positioned-absolute span tree that renders the
 *     currently active ripple records.
 *   - {@link usePressRipple} — hook that returns `{ bind, ripples }`. Drop
 *     `bind` onto a `position: relative` host element (button, swatch, FAB)
 *     and render `ripples` as a child. The hook attaches `pointerdown` and
 *     `keydown` (Enter / Space) handlers, computes the press origin from the
 *     event coordinates relative to the host's `getBoundingClientRect()`,
 *     and decays each ripple via a `motion` tween whose duration is
 *     `rippleDecayMs(useEffectiveConnectionType())` ms (600ms on 4g/unknown,
 *     800ms on 2g/3g per Requirement 1.4).
 *
 * Live-accent contract (Requirement 11.3 → 1.4):
 *   The `--ripple-accent` CSS custom property is read at the moment of the
 *   press from `document.documentElement`, then frozen onto the spawned
 *   ripple record. A subsequent palette swap retints future ripples but
 *   does not retint already-firing ones.
 *
 * Reduced-motion contract (Requirement 17.2 / 19.1):
 *   Under `prefers-reduced-motion: reduce`, presses are silently absorbed —
 *   no ripple record is spawned and no `motion` timeline is scheduled. The
 *   host still receives its native click/keypress so state changes happen
 *   exactly as they do without ripples.
 */

import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type RefObject,
} from "react";

import {
  m,
  rippleDecayMs,
  useEffectiveConnectionType,
  useReducedMotionState,
} from "@/lib/motion-engine";

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

/**
 * Cap on simultaneous ripple records. Material guidelines call for at most
 * a small handful of overlapping ripples; capping protects against runaway
 * memory growth from auto-repeat keydowns or rapid-fire taps.
 */
const MAX_RIPPLES = 4;

/**
 * The ripple span's starting opacity. The alpha embedded in `--ripple-accent`
 * (`oklch(... / 0.4)` per design §C.2) is multiplied by this value, so the
 * effective starting alpha sits around 0.4 at press time and tapers to 0.
 */
const RIPPLE_START_OPACITY = 1;

/**
 * Fallback color used when `--ripple-accent` is missing (e.g. SSR markup
 * before tokens hydrate, or non-DOM test environments). `currentColor`
 * keeps the ripple visible without coupling to any one theme.
 */
const RIPPLE_FALLBACK_COLOR = "currentColor";

// ---------------------------------------------------------------------------
// Pure helper — Property 10 target
// ---------------------------------------------------------------------------

/**
 * Returns the radius the ripple span must reach for it to fully cover the
 * host element from any press origin — i.e. the diagonal of the host's
 * bounding rect, `Math.hypot(width, height)`.
 *
 * The helper is total: non-finite or negative inputs collapse to `0` so
 * Property 10's fast-check generators can hammer it without guarding for
 * NaN / Infinity edge cases.
 */
export function computeRippleRadius(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return 0;
  const w = width > 0 ? width : 0;
  const h = height > 0 ? height : 0;
  return Math.hypot(w, h);
}

// ---------------------------------------------------------------------------
// Internal record + container
// ---------------------------------------------------------------------------

interface RippleRecord {
  /** Monotonic id used as the React key and the completion correlation id. */
  readonly id: number;
  /** Origin x, in pixels relative to the host element's `getBoundingClientRect`. */
  readonly x: number;
  /** Origin y, in pixels relative to the host element's `getBoundingClientRect`. */
  readonly y: number;
  /** Radius the ripple span expands to, in pixels. */
  readonly radius: number;
  /** Frozen `--ripple-accent` value at press time (Requirement 11.3 → 1.4). */
  readonly color: string;
  /** Decay duration for this record, in milliseconds. */
  readonly durationMs: number;
}

const MotionSpan = m("span");

const CONTAINER_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  // Inherit the host's border radius so the ripples are clipped to whatever
  // surface they are decorating (rounded buttons, circular swatches, …).
  borderRadius: "inherit",
  pointerEvents: "none",
};

function buildRippleStyle(record: RippleRecord): CSSProperties {
  return {
    position: "absolute",
    left: record.x - record.radius,
    top: record.y - record.radius,
    width: record.radius * 2,
    height: record.radius * 2,
    borderRadius: "50%",
    backgroundColor: record.color,
    pointerEvents: "none",
    willChange: "transform, opacity",
  };
}

// ---------------------------------------------------------------------------
// <Ripple/> — positioned-absolute span tree
// ---------------------------------------------------------------------------

export interface RippleProps {
  /** Currently active ripple records. */
  readonly ripples: ReadonlyArray<RippleRecord>;
  /**
   * Callback fired when an individual ripple's decay tween completes; the
   * hook uses this to garbage-collect finished records out of state. Under
   * reduced motion the `m()` wrapper strips this prop along with the rest
   * of motion's animation directives — but the hook never spawns ripples
   * in that branch, so the callback path is moot.
   */
  readonly onRippleComplete?: (id: number) => void;
}

/**
 * Renders the active ripple records inside a `pointer-events: none`
 * positioned-absolute container so the ripples never block clicks on the
 * host element. Drop this directly inside the bound element returned by
 * {@link usePressRipple}.
 */
export function Ripple({ ripples, onRippleComplete }: RippleProps): ReactElement {
  return (
    <span aria-hidden="true" data-slot="ripple-container" style={CONTAINER_STYLE}>
      {ripples.map((record) => (
        <MotionSpan
          key={record.id}
          data-slot="ripple"
          initial={{ opacity: RIPPLE_START_OPACITY, scale: 0 }}
          animate={{ opacity: 0, scale: 1 }}
          transition={{
            duration: record.durationMs / 1000,
            ease: "easeOut",
          }}
          onAnimationComplete={() => onRippleComplete?.(record.id)}
          style={buildRippleStyle(record)}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// usePressRipple — the hook every interactive surface consumes
// ---------------------------------------------------------------------------

export interface UsePressRippleBindings<T extends HTMLElement> {
  readonly ref: RefObject<T | null>;
  readonly onPointerDown: (event: ReactPointerEvent<T>) => void;
  readonly onKeyDown: (event: ReactKeyboardEvent<T>) => void;
}

export interface UsePressRippleResult<T extends HTMLElement> {
  /**
   * Spread onto the host element. The host MUST establish a containing
   * block for absolute positioning (e.g. `position: relative`) so the
   * ripple container clips correctly.
   */
  readonly bind: UsePressRippleBindings<T>;
  /** Render this fragment somewhere inside the bound element. */
  readonly ripples: ReactElement;
}

/**
 * Reads the live `--ripple-accent` CSS custom property from
 * `document.documentElement`, falling back to {@link RIPPLE_FALLBACK_COLOR}
 * when the property is unset or the environment has no DOM (SSR / tests
 * without jsdom). Reading at press time is the live-accent contract from
 * Requirement 11.3 — palette swaps after the press do not retint
 * already-firing ripples.
 */
function readRippleAccent(): string {
  if (typeof window === "undefined") return RIPPLE_FALLBACK_COLOR;
  if (typeof document === "undefined") return RIPPLE_FALLBACK_COLOR;
  if (typeof getComputedStyle !== "function") return RIPPLE_FALLBACK_COLOR;
  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--ripple-accent")
      .trim();
    return raw.length > 0 ? raw : RIPPLE_FALLBACK_COLOR;
  } catch {
    return RIPPLE_FALLBACK_COLOR;
  }
}

/**
 * Returns `true` for the keys that count as a "press" on a button: Enter
 * and Space. Keeps `Spacebar` in the set for older browsers that have not
 * caught up to the modern `KeyboardEvent.key` value of `" "`.
 */
function isActivationKey(key: string): boolean {
  return key === "Enter" || key === " " || key === "Spacebar";
}

/**
 * Wires Material press ripples into a host element.
 *
 * @example
 *   const { bind, ripples } = usePressRipple<HTMLButtonElement>();
 *   return (
 *     <button {...bind} className="relative overflow-hidden">
 *       Press me
 *       {ripples}
 *     </button>
 *   );
 */
export function usePressRipple<
  T extends HTMLElement = HTMLElement,
>(): UsePressRippleResult<T> {
  const ref = useRef<T | null>(null);
  const [ripples, setRipples] = useState<ReadonlyArray<RippleRecord>>([]);
  const nextIdRef = useRef(0);

  const reduced = useReducedMotionState();
  const effectiveType = useEffectiveConnectionType();
  const decayMs = rippleDecayMs(effectiveType);

  // Mirror the latest hook values onto refs so the event handlers do not
  // need to be recreated each render — important because consumers will
  // typically spread `bind` onto a button and we want stable identities.
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const decayRef = useRef(decayMs);
  decayRef.current = decayMs;

  const spawnRipple = useCallback(
    (originX: number, originY: number, width: number, height: number): void => {
      const id = nextIdRef.current;
      nextIdRef.current = id + 1;
      const record: RippleRecord = {
        id,
        x: originX,
        y: originY,
        radius: computeRippleRadius(width, height),
        color: readRippleAccent(),
        durationMs: decayRef.current,
      };
      setRipples((prev) => {
        // Cap the list so a malicious key-repeat cannot pile records up
        // forever. Drop the oldest entries first since they are nearest to
        // their fade-out deadline anyway.
        if (prev.length >= MAX_RIPPLES) {
          const keep = prev.slice(prev.length - MAX_RIPPLES + 1);
          return [...keep, record];
        }
        return [...prev, record];
      });
    },
    [],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<T>): void => {
      if (reducedRef.current) return;
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      spawnRipple(x, y, rect.width, rect.height);
    },
    [spawnRipple],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<T>): void => {
      if (reducedRef.current) return;
      if (!isActivationKey(event.key)) return;
      // Auto-repeat presses (holding the key) must not flood the queue.
      if (event.repeat) return;
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      // Keyboard activation has no pointer coordinates — origin is the
      // host's geometric center per the task spec.
      spawnRipple(rect.width / 2, rect.height / 2, rect.width, rect.height);
    },
    [spawnRipple],
  );

  const handleRippleComplete = useCallback((id: number): void => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return {
    bind: { ref, onPointerDown, onKeyDown },
    ripples: <Ripple ripples={ripples} onRippleComplete={handleRippleComplete} />,
  };
}
