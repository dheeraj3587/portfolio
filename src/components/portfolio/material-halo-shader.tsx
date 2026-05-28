"use client";

/**
 * MaterialHaloShader — deferred-mount hero halo (Task 5.3).
 *
 * Behavior:
 *   • Renders a static CSS `radial-gradient` placeholder keyed off
 *     `--halo-stop-1` / `--halo-stop-2` (with sensible fallbacks) so the
 *     shape reserves space immediately on hydration — no CLS (Req 16.4).
 *   • An `IntersectionObserver` with `rootMargin: "200vh"` watches that
 *     placeholder. Only after it reports the avatar is within 200vh of
 *     the viewport does the heavy `@paper-design/shaders-react`
 *     `MeshGradient` scene mount on top of the placeholder
 *     (Requirements 2.3, 16.4).
 *   • The colour stops are read from `getComputedStyle(document.docElem)`
 *     on mount and re-read on every `palette-changed` window event so a
 *     `Palette_Swatcher` flip retints the halo without a remount
 *     (Requirements 2.3, 11.3).
 *   • If `useEffectiveConnectionType()` resolves to `"2g" | "slow-2g"`,
 *     the shader is never mounted — only the static gradient renders
 *     (Requirement 16.6).
 *   • If `useReducedMotionState()` is true, the shader is also skipped —
 *     ambient hero halo motion is non-essential under reduced motion
 *     (Requirement 17.2 / Req 2.6 ambient-motion clause).
 *   • The `@paper-design/shaders-react` import is loaded via
 *     `next/dynamic({ ssr: false })` so it never enters the initial JS
 *     chunk (Tradeoff 10 in design.md).
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import dynamic from "next/dynamic";

import {
  useEffectiveConnectionType,
  useReducedMotionState,
} from "@/lib/motion-engine";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Lazy shader import
// ---------------------------------------------------------------------------
//
// The shader bundle is heavy and only used here + in the avatar. A
// `next/dynamic` import with `ssr: false` keeps it out of the main chunk
// and out of server-rendered HTML.

const MeshGradient = dynamic(
  () =>
    import("@paper-design/shaders-react").then((mod) => ({
      default: mod.MeshGradient,
    })),
  { ssr: false },
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fallback colours that mirror the design's "android-green" default seed
 * so the static placeholder still reads as the hero halo before the
 * Material_Accent provider has written `--halo-stop-*` to the document. */
const FALLBACK_STOP_1 = "#34a853";
const FALLBACK_STOP_2 = "transparent";

/** IntersectionObserver root margin per Req 16.4 — the shader is allowed
 * to mount once the placeholder is within 200vh of the viewport. */
const NEAR_VIEWPORT_ROOT_MARGIN = "200vh";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface HaloStops {
  stop1: string;
  stop2: string;
}

/** Reads `--halo-stop-1` / `--halo-stop-2` from `documentElement`. Returns
 * the fallbacks if the variables are unset or we're on the server. */
function readHaloStops(): HaloStops {
  if (typeof document === "undefined") {
    return { stop1: FALLBACK_STOP_1, stop2: FALLBACK_STOP_2 };
  }
  const styles = getComputedStyle(document.documentElement);
  const stop1 = styles.getPropertyValue("--halo-stop-1").trim();
  const stop2 = styles.getPropertyValue("--halo-stop-2").trim();
  return {
    stop1: stop1 || FALLBACK_STOP_1,
    stop2: stop2 || FALLBACK_STOP_2,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface MaterialHaloShaderProps {
  /** Extra classes for the wrapping placeholder div. */
  className?: string;
  /** Inline style overrides for the wrapping placeholder div. The caller
   *  is expected to position this component (e.g. absolute inset-0). */
  style?: CSSProperties;
}

export function MaterialHaloShader({
  className,
  style,
}: MaterialHaloShaderProps) {
  const placeholderRef = useRef<HTMLDivElement | null>(null);

  const [nearViewport, setNearViewport] = useState(false);
  const [stops, setStops] = useState<HaloStops>(() => ({
    stop1: FALLBACK_STOP_1,
    stop2: FALLBACK_STOP_2,
  }));

  const reducedMotion = useReducedMotionState();
  const effectiveType = useEffectiveConnectionType();
  const isSlowConnection =
    effectiveType === "2g" || effectiveType === "slow-2g";

  // ---- Read halo stops on mount + on every `palette-changed` event. ----
  useEffect(() => {
    setStops(readHaloStops());

    function handlePaletteChanged() {
      setStops(readHaloStops());
    }

    window.addEventListener("palette-changed", handlePaletteChanged);
    return () => {
      window.removeEventListener("palette-changed", handlePaletteChanged);
    };
  }, []);

  // ---- Defer shader mount until placeholder is within 200vh. ----
  //
  // Skip observing entirely if we already know we'll never mount the
  // shader (slow connection or reduced motion) — there's no benefit to
  // setting `nearViewport` in those branches.
  useEffect(() => {
    if (isSlowConnection || reducedMotion) return;
    const node = placeholderRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      // Older browsers / test envs without IntersectionObserver: fall
      // through to mount immediately so we don't get stuck on the
      // placeholder forever.
      setNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setNearViewport(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: NEAR_VIEWPORT_ROOT_MARGIN },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [isSlowConnection, reducedMotion]);

  const placeholderStyle: CSSProperties = {
    background: `radial-gradient(circle at 50% 50%, var(--halo-stop-1, ${FALLBACK_STOP_1}), var(--halo-stop-2, ${FALLBACK_STOP_2}) 70%)`,
    ...style,
  };

  // The shader is only mounted when:
  //   • we're not on a 2g/slow-2g connection (Req 16.6), AND
  //   • reduced motion is not active (ambient halo motion is opt-out), AND
  //   • the placeholder is within 200vh of the viewport (Req 16.4).
  const shouldMountShader = nearViewport && !isSlowConnection && !reducedMotion;

  return (
    <div
      ref={placeholderRef}
      aria-hidden="true"
      data-slot="material-halo-shader"
      className={cn("pointer-events-none absolute inset-0", className)}
      style={placeholderStyle}
    >
      {shouldMountShader ? (
        <MeshGradient
          className="absolute inset-0 h-full w-full"
          colors={[stops.stop1, stops.stop2]}
          // 8s–16s visual cycle per Req 2.3 — `speed` is normalized in the
          // shader; 0.25 lands the cycle around ~12s which is mid-range.
          speed={0.25}
          distortion={0.55}
          swirl={0.4}
        />
      ) : null}
    </div>
  );
}

export default MaterialHaloShader;
