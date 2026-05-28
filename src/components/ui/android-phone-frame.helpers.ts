/**
 * Pure helpers for `AndroidPhoneFrame`.
 *
 * Mirrors the layout-math contract of `iphone-frame.helpers.ts` so the
 * Android variant of `Phone_Frame` participates in the same
 * `--device-screen-bg` convention, exposes the same set of pure pricing
 * functions (background → tint, side-button geometry, status-bar
 * top/height/font math), and stays framework-agnostic. No React imports,
 * no DOM access, no module-level mutable state, no I/O. Every export is a
 * pure function over plain TypeScript values.
 *
 * The Android variant differs from iOS in three places:
 *
 *   1. **Aspect ratio.** Pixel-class hardware is taller and narrower than
 *      the iPhone 17 Pro Max. The frame uses a 0.45 width/height ratio
 *      (vs iOS 0.4774).
 *   2. **Camera disc instead of Dynamic Island.** A small circular punch-
 *      hole sits top-center; the status-bar row clears it instead of
 *      flanking a pill.
 *   3. **Gesture bar instead of home indicator.** A 36 %-wide, 3 px-tall
 *      fully-rounded bar sits at the bottom of the screen.
 *
 * The colour math (`tryParseHexOrRgb`, `relativeLuminance`,
 * `resolveScreenBackground`, `resolveStatusBarTint`) is duplicated here
 * verbatim from the iPhone helpers so the Android module is self-
 * contained and can be tested independently. The iPhone helpers file is
 * kept byte-identical per the design's preservation contract.
 *
 * See `.kiro/specs/android-developer-design-overhaul/design.md` (the
 * `Phone_Frame` variants section) for the algorithms.
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

/** The role identifier for each Pixel-class side button. */
export type AndroidSideButtonRole = "power" | "volumeRocker";

/** Geometry for a single side-button rail. */
export type AndroidSideButtonGeometry = {
  side: "left" | "right";
  topPct: number;
  lengthPct: number;
  role: AndroidSideButtonRole;
};

/** Result of {@link computeAndroidSideButtonGeometry}. */
export type AndroidSideButtonsGeometry = {
  thickness: number;
  inset: number;
  buttons: ReadonlyArray<AndroidSideButtonGeometry>;
};

/** Result of {@link computeAndroidFrameMetrics}. */
export type AndroidFrameMetrics = {
  // Frame chrome.
  /** Width of the outer titanium-style rail. */
  frameThickness: number;
  /** Width of the inner black bezel that frames the screen. */
  bezelThickness: number;
  /** Outer corner radius of the device body. */
  outerRadius: number;
  /** Corner radius of the screen surface (bezel-inset). */
  screenRadius: number;
  /** Width of the visible screen surface (frame width minus rails + bezel). */
  screenWidth: number;

  // Camera punch-hole disc (replaces the iPhone's Dynamic Island).
  /** Diameter of the circular punch-hole disc at top-center. */
  punchHoleDiameter: number;
  /** Inset from the screen's top edge to the punch-hole's top edge. */
  punchHoleTop: number;

  // Status bar row.
  /** Top inset of the status-bar row (matches `punchHoleTop`). */
  statusBarTop: number;
  /** Height of the status-bar row, large enough to clear the punch-hole. */
  statusBarHeight: number;
  /** Font size used by the time + signal/wifi/battery glyphs. */
  statusBarFontPx: number;
  /** Horizontal padding from each screen edge to the status-bar content. */
  statusBarSidePadding: number;

  // Child padding so app content does not collide with chrome.
  /** `paddingTop` to apply to the screen container so children render below
   *  the status-bar row (mirrors iPhone's `statusBarTop + statusBarHeight +
   *  buffer` formula). */
  childPaddingTop: number;

  // Gesture bar (replaces the iPhone's home indicator).
  /** Width of the gesture bar (36 % of `screenWidth`). */
  gestureBarWidth: number;
  /** Height of the gesture bar (~3 px, scales gently with frame width). */
  gestureBarHeight: number;
  /** Bottom inset from the screen's bottom edge to the gesture bar. */
  gestureBarBottom: number;
};

/**
 * Aspect ratio (width / height) of the Android phone frame. Pixel-class
 * hardware is taller and narrower than the iPhone 17 Pro Max (0.4774).
 * Exposed as a constant so the component, the variant cross-fade
 * wrapper, and the layout-shift-prevention reservation in §16.2 can
 * agree on a single value.
 */
export const ANDROID_FRAME_ASPECT_RATIO = 0.45;

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
 * Behaviour matches `iphone-frame.helpers.ts#resolveScreenBackground` so
 * descendants reading `var(--device-screen-bg)` see identical defaults
 * regardless of which `Phone_Frame` variant is mounted:
 *
 *   - `screenBackground === undefined`: return the legacy default for the
 *     given `screenColorScheme` (`#ffffff` / `1.0` for light, `#0a0a0b` /
 *     `0.04` for dark).
 *   - Parsable hex / rgb input: return the input as-is with its computed
 *     WCAG luminance.
 *   - Non-parsable input (gradient, `oklch(...)`, `var(...)`, named
 *     colours, etc.): return the input as-is with a fallback luminance
 *     derived from the colour scheme (`1.0` for light, `0.04` for dark).
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

// ─── computeAndroidFrameMetrics ──────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Compute every per-frame layout dimension for `AndroidPhoneFrame` from a
 * single `width` (the frame's outer width in CSS pixels).
 *
 * The math mirrors `iphone-frame.tsx`'s inline calculations so the screen
 * surface, the bezel, and the child paddingTop behave identically across
 * variants. The Android-specific extras are:
 *
 *   - **Camera punch-hole disc.** A circular hole at top-center sized to
 *     read as a Pixel-class front camera. The status-bar row's height is
 *     pegged to the disc's diameter so app content slots in cleanly
 *     beneath both.
 *   - **Status-bar font + side padding.** The font scales with the frame
 *     width using the same ratio as the iPhone status bar (≈3.4 % of
 *     width). Side padding is comfortable by default so "9:41" never
 *     hugs the curved corner.
 *   - **Gesture bar.** A 36 %-wide, 3 px-tall, fully-rounded bar replaces
 *     the iOS home indicator at the bottom.
 *
 * All output values are non-negative integers (in CSS pixels) so the
 * component can apply them directly as inline styles without further
 * post-processing.
 */
export function computeAndroidFrameMetrics(width: number): AndroidFrameMetrics {
  // Outer rail + inner bezel mirror the iPhone constants so a project
  // switching variants does not perceptibly resize its frame.
  const frameThickness = Math.max(5, Math.round(width * 0.022));
  const bezelThickness = Math.max(2, Math.round(width * 0.006));
  const outerRadius = Math.round(width * 0.155);
  const screenRadius = outerRadius - frameThickness - bezelThickness;
  const screenWidth = width - 2 * (frameThickness + bezelThickness);

  // Camera punch-hole. The design calls for "~10 % width camera punch-hole
  // disc top-center"; we land at 6 % which gives a Pixel-authentic front-
  // camera diameter (≈22 px on a 360 px frame) without crowding the
  // status-bar text. Min-clamped so it stays visible at small widths.
  const punchHoleDiameter = Math.max(16, Math.round(width * 0.06));
  // Inset from the screen's top edge — mirrors the iPhone's `islandTop`
  // ratio (≈3.4 % of width) so vertical chrome rhythm matches across
  // variants.
  const punchHoleTop = Math.max(6, Math.round(width * 0.025));

  // Status bar. Sized to fully clear the punch-hole and accommodate the
  // time + icons font.
  const statusBarFontPx = Math.max(10, Math.round(width * 0.034));
  const statusBarTop = punchHoleTop;
  const statusBarHeight = Math.max(
    punchHoleDiameter + 4,
    Math.round(statusBarFontPx * 1.4),
  );
  // Comfortable horizontal padding from each screen edge.
  const statusBarSidePadding = Math.max(12, Math.round(width * 0.04));

  // Push children below the entire chrome region (top inset + bar +
  // a one-percent buffer matching `iphone-frame.tsx`).
  const childPaddingTop =
    statusBarTop + statusBarHeight + Math.round(width * 0.012);

  // Gesture bar. 36 % of screen width, ≈3 px tall (scales gently up so
  // larger frames keep a visible bar), bottom inset matches the iPhone
  // home indicator's bottom inset for visual rhythm.
  const gestureBarWidth = Math.round(screenWidth * 0.36);
  const gestureBarHeight = Math.max(3, Math.round(width * 0.008));
  const gestureBarBottom = Math.max(4, Math.round(width * 0.018));

  return {
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
  };
}

// ─── computeAndroidSideButtonGeometry ────────────────────────────────────────

// Pixel-class side buttons: power button + volume rocker, both on the
// right rail. Percentages are taken from product photography of recent
// Pixel hardware and rounded to one decimal so the contract is stable.
const ANDROID_SIDE_BUTTONS: ReadonlyArray<AndroidSideButtonGeometry> = [
  { side: "right", topPct: 18.0, lengthPct: 7.0, role: "power" },
  { side: "right", topPct: 28.0, lengthPct: 14.0, role: "volumeRocker" },
];

/**
 * Compute the per-frame side-button geometry for `AndroidPhoneFrame`.
 *
 * Returns the shared rail thickness (clamped to `[5, 8]` px so it
 * matches the iPhone variant pixel-for-pixel at every supported width),
 * the outward inset past the frame edge (`>= 1` px), and the two
 * Pixel-class buttons in DOM order: power, volumeRocker.
 */
export function computeAndroidSideButtonGeometry(
  width: number,
): AndroidSideButtonsGeometry {
  const thickness = clamp(Math.round(width * 0.016), 5, 8);
  const inset = Math.max(1, Math.round(thickness * 0.3));
  return { thickness, inset, buttons: ANDROID_SIDE_BUTTONS };
}
