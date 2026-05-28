"use client";

/**
 * AndroidBootOverlay — child of `IntroOverlay` that paints an Android 16
 * boot sequence in front of the existing GSAP-driven intro.
 *
 * Task 14.1 scope (this file):
 *   - Opaque black backdrop, full-viewport, mounted before the existing
 *     `ScrollTextMotion` and FLIP morph (Requirement 13.2).
 *   - Animates Android 16-style status-bar tokens in: time fades in,
 *     signal / wifi / battery slide in from the right with a 60 ms stagger.
 *   - Reveals a centered "DHEERAJ" logo in `Roboto` / `Google Sans Display`
 *     (fallback Geist Sans) once the status bar settles.
 *   - Dissolves at ~1500 ms.
 *   - A `setTimeout(onComplete, 1800)` enforces the hard cap from
 *     Requirement 13.2 even if a CSS animation never fires (e.g. a stalled
 *     GPU thread). The timer is cleared on unmount.
 *
 * The overlay tree contains ONLY `motion`-free DOM (no `motion/react`
 * imports, no `<motion.*>` elements) so the existing GSAP FLIP morph in
 * `runOutro()` can own the layout transitions without competing with a
 * concurrent layout-animating framework (design.md §C.7, §Risks).
 */

import { useEffect, useId, useRef } from "react";

interface AndroidBootOverlayProps {
  /**
   * Called exactly once after the 1800 ms boot cap elapses, OR when the
   * dissolve completes — whichever comes first. The caller (`IntroOverlay`)
   * uses this to advance to the scroll-text segment of the intro.
   */
  onComplete: () => void;
  /**
   * Optional class name appended to the root host. Used by `IntroOverlay`
   * to align with the existing intro-host stacking context.
   */
  className?: string;
}

/** Single source of truth for the per-element timeline (in milliseconds). */
const TIMING = {
  /** Time numerals appear immediately as a calm anchor. */
  timeIn: { delay: 0, duration: 320 },
  /** Status-bar icons slide in from the right edge with a 60 ms stagger. */
  iconStaggerStepMs: 60,
  iconBaseDelay: 180,
  iconDuration: 260,
  /** Logo fades in once the status-bar reveal has settled. */
  logoIn: { delay: 600, duration: 420 },
  /** Dissolve begins at 1500 ms and completes well before the 1800 ms cap. */
  dissolve: { delay: 1500, duration: 280 },
  /** Hard cap (Requirement 13.2). */
  bootCapMs: 1800,
} as const;

export function AndroidBootOverlay({
  onComplete,
  className,
}: AndroidBootOverlayProps) {
  // `useId` keeps keyframe + animation names unique per mount so two
  // overlays in the same DOM (e.g. fast-refresh) cannot collide.
  const scope = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const k = (name: string) => `${name}-${scope}`;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const firedRef = useRef(false);

  useEffect(() => {
    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      onCompleteRef.current();
    };
    const id = window.setTimeout(fire, TIMING.bootCapMs);
    return () => {
      window.clearTimeout(id);
    };
  }, []);

  // Each status-bar icon shares the same slide-in keyframe but with its
  // own animation-delay so the stagger reads as a single Compose-flavored
  // gesture.
  const iconDelay = (index: number): number =>
    TIMING.iconBaseDelay + index * TIMING.iconStaggerStepMs;

  const fontStack =
    'Roboto, "Google Sans Display", var(--font-geist-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={[
        "fixed inset-0 z-[100] flex flex-col items-center justify-center",
        "bg-black text-white select-none",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        animationName: k("dissolve"),
        animationDuration: `${TIMING.dissolve.duration}ms`,
        animationDelay: `${TIMING.dissolve.delay}ms`,
        animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        animationFillMode: "forwards",
      }}
    >
      {/* Inline keyframes keep the overlay self-contained — globals.css does
          not need to learn about boot-only animations, and there is zero
          risk of a class-name collision with the existing intro CSS. */}
      <style>{`
        @keyframes ${k("fade-in")} {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ${k("slide-in-right")} {
          from { opacity: 0; transform: translateX(14px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes ${k("logo-in")} {
          from { opacity: 0; transform: translateY(6px); letter-spacing: -0.04em; }
          to   { opacity: 1; transform: translateY(0);   letter-spacing: -0.02em; }
        }
        @keyframes ${k("dissolve")} {
          from { opacity: 1; }
          to   { opacity: 0; visibility: hidden; }
        }
      `}</style>

      {/* Status bar — top of the viewport, mirrors Pixel's Android 16 chrome.
          Pure DOM, no motion components. */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-3 pb-2"
        style={{
          fontFamily: fontStack,
          fontVariantNumeric: "tabular-nums",
          fontSize: "0.875rem",
          fontWeight: 500,
          letterSpacing: "0.01em",
          color: "rgba(255, 255, 255, 0.92)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            opacity: 0,
            animationName: k("fade-in"),
            animationDuration: `${TIMING.timeIn.duration}ms`,
            animationDelay: `${TIMING.timeIn.delay}ms`,
            animationTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
            animationFillMode: "forwards",
          }}
        >
          9:41
        </span>

        <div
          className="flex items-center gap-2"
          style={{ height: "0.875rem" }}
        >
          {/* Signal — five bars rising left-to-right. */}
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "flex-end",
              gap: 1.5,
              opacity: 0,
              animationName: k("slide-in-right"),
              animationDuration: `${TIMING.iconDuration}ms`,
              animationDelay: `${iconDelay(0)}ms`,
              animationTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
              animationFillMode: "forwards",
            }}
          >
            <SignalIcon />
          </span>

          {/* Wi-Fi */}
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              opacity: 0,
              animationName: k("slide-in-right"),
              animationDuration: `${TIMING.iconDuration}ms`,
              animationDelay: `${iconDelay(1)}ms`,
              animationTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
              animationFillMode: "forwards",
            }}
          >
            <WifiIcon />
          </span>

          {/* Battery */}
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              opacity: 0,
              animationName: k("slide-in-right"),
              animationDuration: `${TIMING.iconDuration}ms`,
              animationDelay: `${iconDelay(2)}ms`,
              animationTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
              animationFillMode: "forwards",
            }}
          >
            <BatteryIcon />
          </span>
        </div>
      </div>

      {/* Centered DHEERAJ logo. The font stack prefers the Android system
          fonts and falls back to the project's Geist Sans CSS variable. */}
      <div
        aria-hidden="true"
        style={{
          fontFamily: fontStack,
          fontWeight: 500,
          fontSize: "clamp(2.5rem, 9vw, 5rem)",
          letterSpacing: "-0.02em",
          color: "rgba(255, 255, 255, 0.96)",
          opacity: 0,
          animationName: k("logo-in"),
          animationDuration: `${TIMING.logoIn.duration}ms`,
          animationDelay: `${TIMING.logoIn.delay}ms`,
          animationTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
          animationFillMode: "forwards",
        }}
      >
        DHEERAJ
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status-bar glyphs — minimal SVG approximations of the Pixel Android 16
// chrome. Kept inline so the overlay has no external image deps and the
// boot animation is paint-only.
// ---------------------------------------------------------------------------

function SignalIcon() {
  return (
    <svg
      width="14"
      height="12"
      viewBox="0 0 14 12"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="0" y="8" width="2" height="4" rx="0.5" />
      <rect x="3" y="6" width="2" height="6" rx="0.5" />
      <rect x="6" y="4" width="2" height="8" rx="0.5" />
      <rect x="9" y="2" width="2" height="10" rx="0.5" />
      <rect x="12" y="0" width="2" height="12" rx="0.5" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg
      width="14"
      height="12"
      viewBox="0 0 14 12"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 1.2c2.6 0 5 1 6.8 2.8l-1.4 1.4A7.3 7.3 0 0 0 7 3.2c-2 0-4 .8-5.4 2.2L.2 4A9.3 9.3 0 0 1 7 1.2zm0 3.2c1.7 0 3.3.7 4.5 1.9l-1.4 1.4A4.3 4.3 0 0 0 7 6.4c-1.2 0-2.3.4-3.1 1.3L2.5 6.3A6.3 6.3 0 0 1 7 4.4zm0 3.2c.9 0 1.6.3 2.2.9L7 11l-2.2-2.5c.6-.6 1.3-.9 2.2-.9z" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg
      width="22"
      height="12"
      viewBox="0 0 22 12"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="0.5"
        y="0.5"
        width="19"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeOpacity="0.7"
      />
      <rect x="2" y="2" width="13" height="8" rx="1" fill="currentColor" />
      <rect
        x="20"
        y="3.5"
        width="1.5"
        height="5"
        rx="0.5"
        fill="currentColor"
        fillOpacity="0.7"
      />
    </svg>
  );
}

export default AndroidBootOverlay;
