/**
 * Pure helpers for `IPhoneFrame`.
 *
 * This module is intentionally framework-agnostic: no React imports, no DOM
 * access, no module-level mutable state, no I/O. Every export is a pure
 * function over plain TypeScript values, so the helpers can be exercised
 * directly by property-based and unit tests without spinning up a renderer.
 *
 * See `.kiro/specs/iphone-frame-visual-fix/design.md` for the algorithms.
 */

/** A colour resolved for the screen container, with its perceptual luminance. */
export type ResolvedScreenBackground = {
  /** CSS colour value applied to the screen container's `background`. */
  value: string;
  /** WCAG sRGB relative luminance in `[0, 1]`. */
  luminance: number;
};

/** The two exact tints the status bar can resolve to today. */
export type StatusBarTint = "#0a0a0b" | "#f4f4f5";

/** The role identifier for each of the five iPhone side buttons. */
export type SideButtonRole =
  | "action"
  | "volumeUp"
  | "volumeDown"
  | "side"
  | "cameraControl";

/** Geometry for a single side-button rail. */
export type SideButtonGeometry = {
  side: "left" | "right";
  topPct: number;
  lengthPct: number;
  role: SideButtonRole;
};

/** Result of {@link computeSideButtonGeometry}. */
export type SideButtonsGeometry = {
  thickness: number;
  inset: number;
  buttons: ReadonlyArray<SideButtonGeometry>;
};

// ─── tryParseHexOrRgb ────────────────────────────────────────────────────────

const HEX3_RE = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX6_RE = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
// rgb()/rgba() with optional whitespace; alpha (if present) is ignored.
const RGB_RE =
  /^rgba?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*(?:,\s*-?\d+(?:\.\d+)?\s*)?\)$/i;

function clampByteComponent(value: number): number {
  if (Number.isNaN(value)) return 0;
  const rounded = Math.round(value);
  if (rounded < 0) return 0;
  if (rounded > 255) return 255;
  return rounded;
}

/**
 * Parse a CSS colour string into 8-bit RGB components.
 *
 * Accepts:
 *   - `#rgb` and `#rrggbb` (case-insensitive)
 *   - `rgb(r, g, b)` and `rgba(r, g, b, a)` (alpha ignored, whitespace tolerant)
 *
 * Returns `null` for anything else (gradients, `oklch(...)`, `var(...)`,
 * named colours like `"red"`, malformed input, etc.).
 *
 * Fractional rgb components are rounded to the nearest integer; values
 * outside `[0, 255]` are clamped.
 */
export function tryParseHexOrRgb(
  input: string,
): { r: number; g: number; b: number } | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const hex3 = HEX3_RE.exec(trimmed);
  if (hex3 !== null) {
    const r = parseInt(hex3[1] + hex3[1], 16);
    const g = parseInt(hex3[2] + hex3[2], 16);
    const b = parseInt(hex3[3] + hex3[3], 16);
    return { r, g, b };
  }

  const hex6 = HEX6_RE.exec(trimmed);
  if (hex6 !== null) {
    const r = parseInt(hex6[1], 16);
    const g = parseInt(hex6[2], 16);
    const b = parseInt(hex6[3], 16);
    return { r, g, b };
  }

  const rgb = RGB_RE.exec(trimmed);
  if (rgb !== null) {
    const r = clampByteComponent(Number(rgb[1]));
    const g = clampByteComponent(Number(rgb[2]));
    const b = clampByteComponent(Number(rgb[3]));
    return { r, g, b };
  }

  return null;
}

// ─── relativeLuminance ───────────────────────────────────────────────────────

function srgbToLinear(channel: number): number {
  // `channel` is expected to be in [0, 1]; clamp defensively.
  const c = channel < 0 ? 0 : channel > 1 ? 1 : channel;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * WCAG sRGB relative luminance for an 8-bit RGB triple, returning a value
 * in `[0, 1]`. White → ~1.0, black → ~0.0, mid-grey (#808080) → ~0.215.
 */
export function relativeLuminance(rgb: {
  r: number;
  g: number;
  b: number;
}): number {
  const rL = srgbToLinear(rgb.r / 255);
  const gL = srgbToLinear(rgb.g / 255);
  const bL = srgbToLinear(rgb.b / 255);
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

// ─── resolveScreenBackground ─────────────────────────────────────────────────

/**
 * Resolve the `screenBackground` prop to a concrete CSS colour and a
 * perceptual luminance suitable for status-bar tint resolution.
 *
 * Behaviour:
 *   - `screenBackground === undefined`: return the legacy default for the
 *     given `screenColorScheme` (`#ffffff` / `1.0` for light, `#0a0a0b` /
 *     `0.04` for dark).
 *   - Parsable hex / rgb input: return the input as-is with its computed
 *     WCAG luminance.
 *   - Non-parsable input (gradient, `oklch(...)`, `var(...)`, named colours,
 *     etc.): return the input as-is with a fallback luminance derived from
 *     the colour scheme (`1.0` for light, `0.04` for dark).
 */
export function resolveScreenBackground(
  screenBackground: string | undefined,
  screenColorScheme: "light" | "dark",
): ResolvedScreenBackground {
  if (screenBackground === undefined) {
    return screenColorScheme === "light"
      ? { value: "#ffffff", luminance: 1.0 }
      : { value: "#0a0a0b", luminance: 0.04 };
  }

  const parsed = tryParseHexOrRgb(screenBackground);
  if (parsed === null) {
    const fallbackLuminance = screenColorScheme === "light" ? 1.0 : 0.04;
    return { value: screenBackground, luminance: fallbackLuminance };
  }

  return { value: screenBackground, luminance: relativeLuminance(parsed) };
}

// ─── resolveStatusBarTint ────────────────────────────────────────────────────

/**
 * Resolve the status-bar tint to one of two exact tokens.
 *
 *   - `"light"` → always `"#f4f4f5"`.
 *   - `"dark"`  → always `"#0a0a0b"`.
 *   - `"auto"`  → `"#0a0a0b"` when the background's luminance is ≥ 0.5,
 *                 otherwise `"#f4f4f5"`. The `screenColorScheme` parameter
 *                 is accepted for symmetry with `resolveScreenBackground`
 *                 but does not influence the auto branch — the resolved
 *                 background already encodes the relevant scheme via its
 *                 fallback luminance.
 */
export function resolveStatusBarTint(
  statusBarTint: "auto" | "light" | "dark",
  _screenColorScheme: "light" | "dark",
  background: ResolvedScreenBackground,
): StatusBarTint {
  if (statusBarTint === "light") return "#f4f4f5";
  if (statusBarTint === "dark") return "#0a0a0b";
  return background.luminance >= 0.5 ? "#0a0a0b" : "#f4f4f5";
}

// ─── computeSideButtonGeometry ───────────────────────────────────────────────

const SIDE_BUTTONS: ReadonlyArray<SideButtonGeometry> = [
  { side: "left", topPct: 13.5, lengthPct: 6.5, role: "action" },
  { side: "left", topPct: 21.0, lengthPct: 10.0, role: "volumeUp" },
  { side: "left", topPct: 32.0, lengthPct: 10.0, role: "volumeDown" },
  { side: "right", topPct: 22.0, lengthPct: 14.0, role: "side" },
  { side: "right", topPct: 39.0, lengthPct: 6.5, role: "cameraControl" },
];

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Compute the per-frame side-button geometry. Returns the shared rail
 * thickness (clamped to `[5, 8]` px), the outward inset past the frame edge
 * (`>= 1` px), and the five buttons in DOM order: action, volumeUp,
 * volumeDown, side, cameraControl.
 */
export function computeSideButtonGeometry(width: number): SideButtonsGeometry {
  const thickness = clamp(Math.round(width * 0.016), 5, 8);
  const inset = Math.max(1, Math.round(thickness * 0.3));
  return { thickness, inset, buttons: SIDE_BUTTONS };
}
