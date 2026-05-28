import type { CSSProperties, ReactNode } from "react";

import {
  ANDROID_FRAME_ASPECT_RATIO,
  computeAndroidFrameMetrics,
  computeAndroidSideButtonGeometry,
  resolveScreenBackground,
  resolveStatusBarTint,
} from "./android-phone-frame.helpers";

/**
 * AndroidPhoneFrame — Pixel-class CSS recreation of an Android 16 device.
 *
 * Sibling of {@link IPhoneFrame}. Mirrors its layout contract so descendants
 * can keep reading `var(--device-screen-bg)` regardless of variant and the
 * `Phone_Frame` dispatcher (task 3.3) can hot-swap between the two without
 * rewriting screen content:
 *
 *   ┌──────────────── frame (obsidian / porcelain) ─────────────┐
 *   │ ┌──────────── inner bezel (#000) ──────────────────────┐ │
 *   │ │ ┌──────────── screen ────────────────────────────────┐ │ │
 *   │ │ │ [9:41]              ●               [signal wifi …]│ │ │  ← status bar
 *   │ │ │                  punch-hole                        │ │ │
 *   │ │ │            CHILDREN (app content)                  │ │ │
 *   │ │ │                                                    │ │ │
 *   │ │ │              [── gesture bar ──]                   │ │ │
 *   │ │ └────────────────────────────────────────────────────┘ │ │
 *   │ └─────────────────────────────────────────────────────────┘ │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Children render *below* the status-bar / punch-hole region thanks to
 * `paddingTop = childPaddingTop` on the screen container. Frame metrics
 * come from {@link computeAndroidFrameMetrics}; side-button geometry from
 * {@link computeAndroidSideButtonGeometry}; colour resolution from
 * {@link resolveScreenBackground} / {@link resolveStatusBarTint}.
 *
 * This is a pure-presentational component with no React state, no DOM
 * effects, and no client-only APIs — it stays RSC-safe so it can be
 * mounted in Server Components without an extra `"use client"` boundary.
 * The variant cross-fade animation lives at the page level (task 9.1).
 */

export interface AndroidPhoneFrameProps {
  width?: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Show the top status-bar row (time + signal/wifi/battery). Defaults to true. */
  showStatusBar?: boolean;
  /** `"auto"` (default) picks light/dark based on the screen background's luminance. */
  statusBarTint?: "auto" | "light" | "dark";
  /** Forces the screen's `color-scheme` and the `device-screen-light` /
   *  `device-screen-dark` class hook used by `globals.css`. */
  screenColorScheme?: "light" | "dark";
  /** Outer body finish. `"obsidian"` is a deep dark gradient, `"porcelain"` is
   *  a soft warm-white gradient. Both keep the same rail / bezel geometry. */
  finish?: "obsidian" | "porcelain";
  /** Render the rounded gesture bar at the bottom of the screen. Defaults to true. */
  pillIndicator?: boolean;
  /**
   * The colour shown behind the entire screen — including the status-bar
   * strip. Any CSS `<color>` value (hex, rgb, oklch). Mirrors the iPhone
   * variant: omitting it falls back to `#ffffff` for `screenColorScheme="light"`
   * and `#0a0a0b` for `"dark"`. The resolved value is also exposed to
   * descendants via the `--device-screen-bg` custom property.
   */
  screenBackground?: string;
}

/** Outer body gradients per finish. Pixel-class hardware reads cooler and
 *  flatter than the iPhone's polished titanium, so the mid-stops are kept
 *  closer to a single hue with a faint diagonal sheen. */
const FINISH_GRADIENTS: Record<
  NonNullable<AndroidPhoneFrameProps["finish"]>,
  string
> = {
  obsidian:
    "linear-gradient(135deg, #2a2a2d 0%, #131316 22%, #1d1d20 50%, #0e0e10 78%, #232327 100%)",
  porcelain:
    "linear-gradient(135deg, #fafaf9 0%, #e7e5e4 22%, #f1efed 50%, #d6d3d1 78%, #f5f4f2 100%)",
};

export function AndroidPhoneFrame({
  width = 360,
  children,
  className = "",
  style,
  showStatusBar = true,
  statusBarTint = "auto",
  screenColorScheme = "light",
  finish = "obsidian",
  pillIndicator = true,
  screenBackground,
}: AndroidPhoneFrameProps) {
  const metrics = computeAndroidFrameMetrics(width);
  const {
    frameThickness,
    bezelThickness,
    outerRadius,
    screenRadius,
    screenWidth,
    punchHoleDiameter,
    punchHoleTop,
    statusBarTop,
    statusBarHeight,
    statusBarFontPx,
    statusBarSidePadding,
    childPaddingTop,
    gestureBarWidth,
    gestureBarHeight,
    gestureBarBottom,
  } = metrics;

  const resolved = resolveScreenBackground(screenBackground, screenColorScheme);
  const tint = resolveStatusBarTint(statusBarTint, screenColorScheme, resolved);

  const containerStyle: CSSProperties = {
    width,
    aspectRatio: `${ANDROID_FRAME_ASPECT_RATIO}`,
    borderRadius: outerRadius,
    background: FINISH_GRADIENTS[finish],
    boxShadow: [
      // Outer-edge highlight + rail polish (mirrors the iPhone boxShadow
      // stack so a project switching variants does not jump in elevation).
      "inset 0 0 0 0.5px rgba(255,255,255,0.10)",
      "inset 0 0 0 1px rgba(255,255,255,0.16)",
      "inset 0 1.5px 0 rgba(255,255,255,0.06)",
      "inset 0 -1px 0 rgba(0,0,0,0.4)",
      // Bezel-join recess — same trick as the iPhone variant: a coloured
      // inset shadow whose spread equals the rail thickness creates the
      // illusion of the rail stepping down into the inner bezel.
      `inset 0 0 0 ${frameThickness}px rgba(0,0,0,0.55)`,
      // Outer drop shadows.
      "0 50px 80px -25px rgba(0,0,0,0.55)",
      "0 18px 36px -12px rgba(0,0,0,0.4)",
    ].join(", "),
    padding: frameThickness,
    position: "relative",
    isolation: "isolate",
    ...style,
  };

  const innerBezelStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: outerRadius - frameThickness,
    background: "#000",
    padding: bezelThickness,
    position: "relative",
    boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.04)",
  };

  // The screen container is the single source of truth for the device's
  // visible surface colour. We set both the inline `background` and the
  // `--device-screen-bg` custom property to the same resolved value so
  // descendants can opt in via `var(--device-screen-bg, <fallback>)` and
  // the status-bar strip is guaranteed to match the screen content.
  const screenStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: screenRadius,
    background: resolved.value,
    overflow: "hidden",
    position: "relative",
    isolation: "isolate",
    transform: "translateZ(0)",
    colorScheme: screenColorScheme,
    paddingTop: showStatusBar ? childPaddingTop : 0,
    ["--device-screen-bg" as never]: resolved.value,
  };

  return (
    <div className={`relative ${className}`} style={containerStyle}>
      <AndroidSideButtons width={width} finish={finish} />

      <div style={innerBezelStyle}>
        <div
          data-device-screen=""
          className={
            screenColorScheme === "light"
              ? "device-screen-light"
              : "device-screen-dark"
          }
          style={screenStyle}
        >
          {/* Status bar — flanks the camera punch-hole disc */}
          {showStatusBar ? (
            <AndroidStatusBar
              tint={tint}
              top={statusBarTop}
              height={statusBarHeight}
              fontPx={statusBarFontPx}
              sidePadding={statusBarSidePadding}
            />
          ) : null}

          {/* App content */}
          {children}

          {/* Camera punch-hole disc — drawn LAST so it's on top of everything */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 z-[60] -translate-x-1/2 rounded-full"
            style={{
              top: punchHoleTop,
              width: punchHoleDiameter,
              height: punchHoleDiameter,
              background: "#000",
              boxShadow: "0 0 0 0.5px rgba(0,0,0,0.85)",
            }}
          />

          {/* Gesture bar */}
          {pillIndicator ? (
            <AndroidGestureBar
              tint={tint}
              bottom={gestureBarBottom}
              width={gestureBarWidth}
              height={gestureBarHeight}
              colorScheme={screenColorScheme}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Top status-bar row. Time on the left, signal/Wi-Fi/battery on the right.
 *  The camera punch-hole disc is drawn separately by the parent so this row
 *  can stay a simple flexbox with the disc visually flanked on either side. */
function AndroidStatusBar({
  tint,
  top,
  height,
  fontPx,
  sidePadding,
}: {
  tint: string;
  top: number;
  height: number;
  fontPx: number;
  sidePadding: number;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-50 flex items-center justify-between"
      style={{
        top,
        height,
        paddingLeft: sidePadding,
        paddingRight: sidePadding,
        color: tint,
        fontSize: fontPx,
        background: "transparent",
      }}
    >
      <span
        className="font-medium tabular-nums"
        style={{
          fontFamily:
            "'Google Sans', 'Roboto', system-ui, -apple-system, sans-serif",
        }}
      >
        9:41
      </span>
      <span className="flex items-center gap-1.5">
        <SignalGlyph color={tint} size={fontPx} />
        <WifiGlyph color={tint} size={fontPx} />
        <BatteryGlyph color={tint} size={fontPx} />
      </span>
    </div>
  );
}

/** Bottom gesture bar (Android 10+ navigation handle). 36 % width, 3 px tall,
 *  fully rounded. Tint follows the resolved status-bar tint so the bar reads
 *  on both light and dark screen backgrounds. */
function AndroidGestureBar({
  tint,
  bottom,
  width,
  height,
  colorScheme,
}: {
  tint: string;
  bottom: number;
  width: number;
  height: number;
  colorScheme: "light" | "dark";
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-50 flex justify-center"
      style={{ bottom }}
    >
      <div
        className="rounded-full"
        style={{
          width,
          height,
          background: tint,
          opacity: colorScheme === "light" ? 0.85 : 0.9,
        }}
      />
    </div>
  );
}

function SignalGlyph({ color, size }: { color: string; size: number }) {
  const w = Math.round(size * 1.3);
  const h = Math.round(size * 0.85);
  return (
    <svg width={w} height={h} viewBox="0 0 17 11" fill={color}>
      <rect x="0" y="7" width="3" height="4" rx="0.5" />
      <rect x="4.5" y="5" width="3" height="6" rx="0.5" />
      <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" />
      <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
    </svg>
  );
}

function WifiGlyph({ color, size }: { color: string; size: number }) {
  const w = Math.round(size * 1.2);
  const h = Math.round(size * 0.85);
  return (
    <svg width={w} height={h} viewBox="0 0 16 11" fill={color}>
      <path d="M8 11a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Z" />
      <path d="M2.7 5.5a8 8 0 0 1 10.6 0l-1.4 1.4a6 6 0 0 0-7.8 0L2.7 5.5Z" />
      <path d="M.3 3.1a11.5 11.5 0 0 1 15.4 0l-1.4 1.4a9.5 9.5 0 0 0-12.6 0L.3 3.1Z" />
    </svg>
  );
}

function BatteryGlyph({ color, size }: { color: string; size: number }) {
  const w = Math.round(size * 2);
  const h = Math.round(size * 0.95);
  return (
    <svg width={w} height={h} viewBox="0 0 24 11" fill="none">
      <rect
        x="0.5"
        y="0.5"
        width="20"
        height="10"
        rx="2.5"
        stroke={color}
        strokeOpacity="0.4"
      />
      <rect x="2" y="2" width="14" height="7" rx="1" fill={color} />
      <rect
        x="22"
        y="3.5"
        width="1.5"
        height="4"
        rx="0.5"
        fill={color}
        fillOpacity="0.4"
      />
    </svg>
  );
}

/** Pixel-class side buttons: power + volume rocker on the right rail.
 *  Geometry comes from {@link computeAndroidSideButtonGeometry} so the
 *  rail thickness matches the iPhone variant pixel-for-pixel at every
 *  supported width. */
function AndroidSideButtons({
  width,
  finish,
}: {
  width: number;
  finish: NonNullable<AndroidPhoneFrameProps["finish"]>;
}) {
  const { thickness, inset, buttons } = computeAndroidSideButtonGeometry(width);

  const baseGradient =
    finish === "porcelain"
      ? "linear-gradient(to right, #c2c0bd 0%, #e7e5e4 50%, #c2c0bd 100%)"
      : "linear-gradient(to right, #18181b 0%, #2e2e31 50%, #18181b 100%)";

  const sharedBoxShadow = [
    "inset 0 0 0 1px rgba(255,255,255,0.30)",
    "0 0.5px 0 rgba(0,0,0,0.5)",
  ].join(", ");

  return (
    <>
      {buttons.map((button) => {
        const sideOffset =
          button.side === "left" ? { left: -inset } : { right: -inset };

        const buttonStyle: CSSProperties = {
          position: "absolute",
          ...sideOffset,
          top: `${button.topPct}%`,
          height: `${button.lengthPct}%`,
          width: thickness,
          borderRadius: thickness,
          background: baseGradient,
          boxShadow: sharedBoxShadow,
        };

        return (
          <div
            key={button.role}
            aria-hidden
            data-android-button={button.role}
            style={buttonStyle}
          />
        );
      })}
    </>
  );
}
