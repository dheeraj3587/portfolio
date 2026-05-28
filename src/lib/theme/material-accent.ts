/**
 * Material_Accent — pure palette + WCAG contrast helpers.
 *
 * This module is import-safe from server components and tests. It owns:
 *
 *   • `PALETTE_SEEDS`  — the fixed 5-seed Material You palette
 *                        (Requirement 11.1, default `android-green`
 *                        per Requirement 11.5).
 *   • `wcagContrast`   — pure OKLCH-pair contrast ratio
 *                        (Requirement 12.4 / 17.4).
 *   • `resolveFocusRing` — pure tonal resolver that walks lightness
 *                          until the focus ring clears the 3:1 bar
 *                          against the active theme surface
 *                          (Requirements 11.7, 17.4, 19.9).
 *   • `THEME_TOKEN_PAIRS` — body / large-text token pairs used by
 *                            Property 21 (Requirement 12.4).
 *
 * No React, no DOM, no I/O. Numbers in, numbers out.
 *
 * The OKLCH→sRGB math follows the canonical CSS Color Level 4
 * (Björn Ottosson) coefficients, identical to the version shipped by
 * `culori`. Out-of-gamut linear sRGB is clamped to [0, 1] before the
 * WCAG luminance step, which matches what a browser actually paints.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AccentSeedId =
  | "android-green"
  | "compose-purple"
  | "material-blue"
  | "sunset-coral"
  | "mono-graphite";

export interface AccentSeed {
  /** Stable identifier persisted in `localStorage`. */
  readonly id: AccentSeedId;
  /** Human-readable accessible name (Requirement 11.6). */
  readonly name: string;
  /** OKLCH hue in degrees, `0..360`. */
  readonly h: number;
  /** OKLCH chroma component, normalised to `0..1`. */
  readonly s: number;
  /** OKLCH lightness, `0..1`. */
  readonly l: number;
}

/** A bare OKLCH triplet — used by the contrast and ring resolvers. */
export interface OklchColor {
  readonly l: number;
  readonly s: number;
  readonly h: number;
}

export type ThemeMode = "light" | "dark";

// ─────────────────────────────────────────────────────────────────────────────
// Seed table (Requirement 11.1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The fixed Material You-style accent palette. Five seeds keeps the
 * picker readable on a phone while still showing range across hue
 * families. The default seed (`android-green`) is enforced by
 * `palette-swatcher` per Requirement 11.5.
 */
export const PALETTE_SEEDS: readonly AccentSeed[] = [
  { id: "android-green",  name: "Android Green",  h: 142, s: 0.18, l: 0.55 },
  { id: "compose-purple", name: "Compose Purple", h: 300, s: 0.18, l: 0.55 },
  { id: "material-blue",  name: "Material Blue",  h: 250, s: 0.18, l: 0.55 },
  { id: "sunset-coral",   name: "Sunset Coral",   h: 25,  s: 0.20, l: 0.62 },
  { id: "mono-graphite",  name: "Mono Graphite",  h: 250, s: 0.02, l: 0.50 },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// OKLCH → linear sRGB → relative luminance
// ─────────────────────────────────────────────────────────────────────────────

const DEG_TO_RAD = Math.PI / 180;

interface LinearRgb {
  r: number;
  g: number;
  b: number;
}

/**
 * OKLCH → OKLab → linear sRGB.
 *
 * Coefficients are the canonical Ottosson set (CSS Color 4 §13.4 /
 * `culori`'s `convertOklabToLrgb`). Values are returned as raw linear
 * sRGB; out-of-gamut components may be slightly negative or > 1.
 */
function oklchToLinearRgb(color: OklchColor): LinearRgb {
  const L = color.l;
  const C = color.s;
  const hRad = color.h * DEG_TO_RAD;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLab → LMS (cube-root inverse).
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const lCubed = l_ * l_ * l_;
  const mCubed = m_ * m_ * m_;
  const sCubed = s_ * s_ * s_;

  // LMS → linear sRGB.
  const r =  4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
  const g = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
  const blue = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;

  return { r, g, b: blue };
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * WCAG 2 relative luminance from linear sRGB. Components are clamped
 * to `[0, 1]` to fold out-of-gamut OKLCH triplets back into a paintable
 * approximation — the same thing a real browser does at composite time.
 */
function relativeLuminance(rgb: LinearRgb): number {
  const r = clamp01(rgb.r);
  const g = clamp01(rgb.g);
  const b = clamp01(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Pure WCAG contrast ratio between two OKLCH colors. Returns a number
 * in `[1, 21]` — `1` for identical luminance, `21` for pure black on
 * pure white.
 *
 * (Requirement 12.4 — body ≥ 4.5:1, large ≥ 3:1.)
 */
export function wcagContrast(fgOklch: OklchColor, bgOklch: OklchColor): number {
  const fgLum = relativeLuminance(oklchToLinearRgb(fgOklch));
  const bgLum = relativeLuminance(oklchToLinearRgb(bgOklch));
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme surface tokens (design.md §15)
// ─────────────────────────────────────────────────────────────────────────────

/** Light surface ≈ #fafafa / near-white per design §15 / Requirement 12.1. */
const LIGHT_SURFACE: OklchColor = { l: 0.98, s: 0, h: 0 };
/** Dark surface ≈ #0a0a0b per design §15 / Requirement 12.2. */
const DARK_SURFACE: OklchColor = { l: 0.10, s: 0, h: 0 };

const surfaceForTheme = (theme: ThemeMode): OklchColor =>
  theme === "light" ? LIGHT_SURFACE : DARK_SURFACE;

/** Exposed for tests + the property-based generator. */
export const SURFACE_TOKENS: Readonly<Record<ThemeMode, OklchColor>> = {
  light: LIGHT_SURFACE,
  dark: DARK_SURFACE,
};

// ─────────────────────────────────────────────────────────────────────────────
// resolveFocusRing — Requirement 11.7 / Property 8
// ─────────────────────────────────────────────────────────────────────────────

const FOCUS_RING_TARGET_RATIO = 3;
const LIGHTNESS_STEP = 0.05;
const LIGHTNESS_FLOOR = 0.10;
const LIGHTNESS_CEIL = 0.95;
/** Hard upper bound on the search loop. With 0.05 steps over [0.10, 0.95]
 *  the worst case is 17 iterations; the cap is purely defensive. */
const MAX_ITERATIONS = 32;

/**
 * Resolve a focus-ring color for a given seed against the active theme.
 *
 * Strategy (per design.md §C.2 + Requirement 11.7):
 *
 *   1. Start at the seed's native lightness.
 *   2. If it already clears 3:1 against the surface, return as-is.
 *   3. Otherwise step lightness in 0.05 increments — *down* in light
 *      themes (toward black) and *up* in dark themes (toward white) —
 *      until 3:1 is met.
 *   4. Hue (`h`) and chroma (`s`) are preserved so the halo and ripple
 *      stay vivid; only lightness moves (Requirement 11.7).
 *   5. Floor at `0.10` for light themes / ceil at `0.95` for dark.
 *      Property 8 generators use the seeds for which the target is
 *      reachable inside that range.
 */
export function resolveFocusRing(
  seed: AccentSeed,
  theme: ThemeMode,
): { l: number; s: number; h: number } {
  const surface = surfaceForTheme(theme);
  let l = seed.l;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const candidate: OklchColor = { l, s: seed.s, h: seed.h };
    if (wcagContrast(candidate, surface) >= FOCUS_RING_TARGET_RATIO) {
      return { l, s: seed.s, h: seed.h };
    }
    if (theme === "light") {
      if (l <= LIGHTNESS_FLOOR) break;
      l = Math.max(LIGHTNESS_FLOOR, l - LIGHTNESS_STEP);
    } else {
      if (l >= LIGHTNESS_CEIL) break;
      l = Math.min(LIGHTNESS_CEIL, l + LIGHTNESS_STEP);
    }
  }

  // Fall back to the bound — best-effort if no value in range hits 3:1.
  return { l, s: seed.s, h: seed.h };
}

// ─────────────────────────────────────────────────────────────────────────────
// THEME_TOKEN_PAIRS — Property 21 (Requirement 12.4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single foreground/background sample drawn from the theme tokens
 * defined in `globals.css`. `theme` is included so the property test
 * can group samples without re-deriving theme membership.
 */
export interface ThemeTokenPair {
  readonly fg: OklchColor;
  readonly bg: OklchColor;
  readonly theme: ThemeMode;
}

// Approximate OKLCH for the colors actually used in `src/app/globals.css`.
//   #ffffff  → L 1.00, near-grey
//   #fafafa  → L 0.98 (light surface)
//   #0a0a0a  → L 0.13 (light --foreground)
//   #f4f4f5  → L 0.96 (dark --foreground)
//   #0a0a0b  → L 0.13 (dark --background)
//   #525252  → L 0.43 (light --muted-foreground)
//   #a1a1aa  → L 0.68 (dark  --muted-foreground)
const TOKEN_BG_LIGHT: OklchColor = { l: 1.00, s: 0, h: 0 };
const TOKEN_BG_DARK: OklchColor = { l: 0.13, s: 0, h: 0 };
const TOKEN_FG_LIGHT: OklchColor = { l: 0.13, s: 0, h: 0 };
const TOKEN_FG_DARK: OklchColor = { l: 0.96, s: 0, h: 0 };
const TOKEN_MUTED_FG_LIGHT: OklchColor = { l: 0.43, s: 0, h: 0 };
const TOKEN_MUTED_FG_DARK: OklchColor = { l: 0.68, s: 0, h: 0 };

/**
 * Body and large-text design tokens that Property 21 walks. Each entry
 * already encodes its theme so the generator can do
 * `fc.constantFrom(...THEME_TOKEN_PAIRS.body)` and pull a
 * self-describing sample.
 *
 *   • `body`  — must clear 4.5:1 (WCAG AA body copy).
 *   • `large` — must clear 3:1 (WCAG AA large text / icon).
 */
export const THEME_TOKEN_PAIRS: {
  readonly body: readonly ThemeTokenPair[];
  readonly large: readonly ThemeTokenPair[];
} = {
  body: [
    // Light: --foreground (#0a0a0a) over --background (#ffffff)
    { fg: TOKEN_FG_LIGHT, bg: TOKEN_BG_LIGHT, theme: "light" },
    // Dark: --foreground (#f4f4f5) over --background (#0a0a0b)
    { fg: TOKEN_FG_DARK, bg: TOKEN_BG_DARK, theme: "dark" },
  ],
  large: [
    // Light large/secondary: --muted-foreground (#525252) over white
    { fg: TOKEN_MUTED_FG_LIGHT, bg: TOKEN_BG_LIGHT, theme: "light" },
    // Dark large/secondary: --muted-foreground (#a1a1aa) over near-black
    { fg: TOKEN_MUTED_FG_DARK, bg: TOKEN_BG_DARK, theme: "dark" },
  ],
} as const;
