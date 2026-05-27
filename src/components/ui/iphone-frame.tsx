"use client";

import type { CSSProperties, ReactNode } from "react";

import {
  computeSideButtonGeometry,
  resolveScreenBackground,
  resolveStatusBarTint,
} from "./iphone-frame.helpers";

/**
 * IPhoneFrame — precision CSS recreation of the iPhone 17 Pro Max.
 *
 * Layout model (matches real iOS):
 *   ┌──────────────── frame (titanium gradient) ────────────────┐
 *   │ ┌──────────── inner bezel (#000) ──────────────────────┐ │
 *   │ │ ┌──────────── screen ────────────────────────────────┐ │ │
 *   │ │ │ [time]   [Dynamic Island pill]   [signal/wifi/bat]│ │ │  ← status bar row
 *   │ │ │                                                    │ │ │
 *   │ │ │            CHILDREN (app content)                  │ │ │
 *   │ │ │                                                    │ │ │
 *   │ │ │              [home indicator]                      │ │ │
 *   │ │ └────────────────────────────────────────────────────┘ │ │
 *   │ └─────────────────────────────────────────────────────────┘ │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Children render *below* the status-bar row, so app UI starts cleanly
 * underneath the Dynamic Island instead of fighting with the time/icons.
 *
 * Reference (iPhone 17 Pro Max):
 *   - Body 163.4 × 78.0 mm  → aspect 0.4774
 *   - Display 1320 × 2868 px (430 × 932 pt logical)
 *   - Body radius ~55pt; uniform bezel ~4.7pt
 *   - Dynamic Island 125 × 37pt, 14pt inset from top edge
 */

export interface IPhoneFrameProps {
  width?: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  showDynamicIsland?: boolean;
  showHomeIndicator?: boolean;
  showStatusBar?: boolean;
  statusBarTint?: "auto" | "light" | "dark";
  screenColorScheme?: "light" | "dark";
  finish?: "natural" | "black" | "white";
  /**
   * The colour shown behind the entire screen — including the status-bar
   * strip. Any CSS `<color>` value (hex, rgb, oklch). When omitted, defaults
   * to `#ffffff` for `screenColorScheme="light"` and `#0a0a0b` for `"dark"`,
   * preserving the previous behaviour. The resolved value is also exposed
   * to descendants via the `--device-screen-bg` custom property so app
   * screens can read it instead of hard-coding their own background.
   */
  screenBackground?: string;
}

const ASPECT = 78 / 163.4; // 0.4774

const FINISH_GRADIENTS: Record<NonNullable<IPhoneFrameProps["finish"]>, string> = {
  natural:
    "linear-gradient(135deg, #c8c9cc 0%, #8e9094 18%, #54565a 38%, #6a6c70 58%, #3a3b3f 80%, #5e6065 100%)",
  black:
    "linear-gradient(135deg, #38383b 0%, #1c1c1f 22%, #2a2a2d 50%, #18181b 78%, #2e2e31 100%)",
  white:
    "linear-gradient(135deg, #f4f4f5 0%, #d4d4d8 22%, #e4e4e7 50%, #c8c8cc 78%, #ededee 100%)",
};

export function IPhoneFrame({
  width = 360,
  children,
  className = "",
  style,
  showDynamicIsland = true,
  showHomeIndicator = true,
  showStatusBar = true,
  statusBarTint = "auto",
  screenColorScheme = "light",
  finish = "black",
  screenBackground,
}: IPhoneFrameProps) {
  // Slimmer frame to match real iPhone proportions seen in the reference.
  const frameThickness = Math.max(5, Math.round(width * 0.022));
  const bezelThickness = Math.max(2, Math.round(width * 0.006));
  const outerRadius = Math.round(width * 0.155);
  const screenRadius = outerRadius - frameThickness - bezelThickness;
  const screenWidth = width - 2 * (frameThickness + bezelThickness);

  // Dynamic Island: 125pt × 37pt on a 430pt screen → 29% width, 125:37 aspect
  const islandWidth = Math.round(screenWidth * 0.29);
  const islandHeight = Math.round(islandWidth * (37 / 125));
  // 14pt inset from screen top → ~3.4% of frame width
  const islandTop = Math.round(width * 0.034);

  // Status bar row sits at island's vertical centre and matches its height.
  // The row height equals the island height + a tiny buffer so text doesn't
  // touch the island vertically.
  const statusBarTop = islandTop;
  const statusBarHeight = islandHeight;

  const resolved = resolveScreenBackground(screenBackground, screenColorScheme);
  const tint = resolveStatusBarTint(statusBarTint, screenColorScheme, resolved);

  const containerStyle: CSSProperties = {
    width,
    aspectRatio: `${ASPECT}`,
    borderRadius: outerRadius,
    background: FINISH_GRADIENTS[finish],
    boxShadow: [
      // Outermost edge highlight (catches light at the rail's outer corner).
      "inset 0 0 0 0.5px rgba(255,255,255,0.12)",
      // Inner highlight — reads on top of the titanium gradient to give the
      // rail its polished metallic edge.
      "inset 0 0 0 1px rgba(255,255,255,0.18)",
      // Existing directional highlights (top sheen, bottom recess).
      "inset 0 1.5px 0 rgba(255,255,255,0.08)",
      "inset 0 -1px 0 rgba(0,0,0,0.4)",
      // Bezel-join recess — sits at the rail/bezel boundary so the rail
      // appears to step down into the inner bezel rather than meeting it
      // flush. Spread equals the rail thickness so the darkening reaches
      // exactly to the bezel edge.
      `inset 0 0 0 ${frameThickness}px rgba(0,0,0,0.55)`,
      // Outer drop shadows (device sitting on the page).
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
  // `--device-screen-bg` custom property to the same resolved value so app
  // screens can opt in via `var(--device-screen-bg, <fallback>)` and the
  // status-bar strip is guaranteed to match the screen content.
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
    // Push children below the status bar / Dynamic Island region.
    paddingTop: showStatusBar
      ? statusBarTop + statusBarHeight + Math.round(width * 0.012)
      : 0,
    // Expose the resolved background to descendants. Cast keeps TS strict
    // happy without polluting the `CSSProperties` type with a custom prop.
    ["--device-screen-bg" as never]: resolved.value,
  };

  const homeIndicatorBottom = Math.max(4, Math.round(width * 0.018));

  return (
    <div className={`relative ${className}`} style={containerStyle}>
      <SideButtons width={width} finish={finish} outerRadius={outerRadius} />

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
          {/* Status bar — flanks the Dynamic Island on both sides */}
          {showStatusBar ? (
            <StatusBar
              tint={tint}
              top={statusBarTop}
              height={statusBarHeight}
              islandWidth={islandWidth}
              fontPx={Math.max(10, Math.round(width * 0.034))}
            />
          ) : null}

          {/* App content */}
          {children}

          {/* Dynamic Island — drawn LAST so it's on top of everything */}
          {showDynamicIsland ? (
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 z-[60] -translate-x-1/2"
              style={{
                top: islandTop,
                width: islandWidth,
                height: islandHeight,
                background: "#000",
                borderRadius: islandHeight / 2,
                boxShadow: "0 0 0 0.5px rgba(0,0,0,0.85)",
              }}
            />
          ) : null}

          {/* Home indicator */}
          {showHomeIndicator ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 z-50 flex justify-center"
              style={{ bottom: homeIndicatorBottom }}
            >
              <div
                style={{
                  width: `${screenWidth * 0.32}px`,
                  height: Math.max(3, Math.round(width * 0.011)),
                  borderRadius: 999,
                  background: tint,
                  opacity: screenColorScheme === "light" ? 0.85 : 0.9,
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusBar({
  tint,
  top,
  height,
  islandWidth,
  fontPx,
}: {
  tint: string;
  top: number;
  height: number;
  islandWidth: number;
  fontPx: number;
}) {
  // Side padding tuned to iOS — time and icons sit ~28px from screen edge.
  const sidePad = Math.max(14, islandWidth * 0.18);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-50 flex items-center justify-between"
      style={{
        top,
        height,
        paddingLeft: sidePad,
        paddingRight: sidePad,
        color: tint,
        fontSize: fontPx,
        background: "transparent",
      }}
    >
      <span
        className="font-semibold tabular-nums"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
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
      <rect x="22" y="3.5" width="1.5" height="4" rx="0.5" fill={color} fillOpacity="0.4" />
    </svg>
  );
}

function SideButtons({
  width,
  finish,
  outerRadius: _outerRadius,
}: {
  width: number;
  finish: NonNullable<IPhoneFrameProps["finish"]>;
  outerRadius: number;
}) {
  // `_outerRadius` is reserved for a future iteration where the rail caps
  // need to align with the frame's corner curve. Underscore-prefixed so the
  // unused-vars lint rule allows it.
  void _outerRadius;

  const { thickness, inset, buttons } = computeSideButtonGeometry(width);

  const baseGradient =
    finish === "natural"
      ? "linear-gradient(to right, #6e7075 0%, #9c9ea2 50%, #6e7075 100%)"
      : finish === "white"
      ? "linear-gradient(to right, #b8b8bc 0%, #dededf 50%, #b8b8bc 100%)"
      : "linear-gradient(to right, #18181b 0%, #2e2e31 50%, #18181b 100%)";

  // Camera Control mid-stop is intentionally darker than every per-finish
  // side-rail mid-stop (natural #9c9ea2, black #2e2e31, white #dededf) so the
  // recessed-glass appearance reads regardless of `finish` (Requirement 2.4).
  const cameraControlGradient =
    "linear-gradient(to right, #050507 0%, #121214 30%, #1a1a1c 50%, #121214 70%, #050507 100%)";

  const sharedBoxShadow = [
    "inset 0 0 0 1px rgba(255,255,255,0.35)",
    "0 0.5px 0 rgba(0,0,0,0.5)",
  ].join(", ");

  return (
    <>
      {buttons.map((button) => {
        const sideOffset =
          button.side === "left"
            ? { left: -inset }
            : { right: -inset };

        const background =
          button.role === "cameraControl" ? cameraControlGradient : baseGradient;

        const style: CSSProperties = {
          position: "absolute",
          ...sideOffset,
          top: `${button.topPct}%`,
          height: `${button.lengthPct}%`,
          width: thickness,
          borderRadius: thickness,
          background,
          boxShadow: sharedBoxShadow,
        };

        return (
          <div
            key={button.role}
            aria-hidden
            data-iphone-button={button.role}
            style={style}
          />
        );
      })}
    </>
  );
}
