"use client";

/**
 * Material_Accent provider + hook (Task 2.4).
 *
 * Owns the live accent seed for the whole portfolio:
 *
 *   • Reads `localStorage["material-accent-seed"]` on mount, validates
 *     against the seed table, and falls back to `android-green` when the
 *     stored value is missing or invalid (Requirements 11.4, 11.5).
 *   • Applies the CSS custom properties listed in design.md §C.2 directly
 *     on `document.documentElement` so the rest of the page can re-tint
 *     without a React re-render (Requirement 11.3, 12.5).
 *   • Tracks the active theme by observing `documentElement` class
 *     changes (`light` / `dark`), then re-derives `--ring-accent` so
 *     focus rings keep clearing 3:1 on theme flips (Requirement 11.7).
 *   • Persists the new seed id back to `localStorage` and listens for
 *     cross-tab `storage` events so a swatch click in another tab tints
 *     this tab too (Requirement 11.4).
 *   • Dispatches a `palette-changed` `CustomEvent` on `window` after
 *     each apply so the hero halo shader can re-read its stops without
 *     subscribing to React state (design.md §Hero Section / task 5.4).
 *
 * Every `localStorage` access is wrapped in `try/catch` so private
 * browsing modes (where access throws) do not crash the page.
 */

import {
  createContext,
  createElement,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  PALETTE_SEEDS,
  resolveFocusRing,
  type AccentSeed,
  type AccentSeedId,
  type OklchColor,
} from "@/lib/theme/material-accent";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "material-accent-seed";
const DEFAULT_SEED_ID: AccentSeedId = "android-green";
const PALETTE_CHANGED_EVENT = "palette-changed";

const SEED_BY_ID: ReadonlyMap<AccentSeedId, AccentSeed> = new Map(
  PALETTE_SEEDS.map((seed) => [seed.id, seed]),
);

const DEFAULT_SEED: AccentSeed = (() => {
  const seed = SEED_BY_ID.get(DEFAULT_SEED_ID);
  if (!seed) {
    // PALETTE_SEEDS is authored, so this is unreachable. The throw protects
    // against accidental future edits dropping the default.
    throw new Error(
      `Material_Accent: default seed "${DEFAULT_SEED_ID}" missing from PALETTE_SEEDS`,
    );
  }
  return seed;
})();

type ThemeMode = "light" | "dark";

// ---------------------------------------------------------------------------
// localStorage helpers — every access is `try/catch`-guarded
// ---------------------------------------------------------------------------

function readStoredSeedId(): AccentSeedId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    return SEED_BY_ID.has(raw as AccentSeedId) ? (raw as AccentSeedId) : null;
  } catch {
    // Private mode / disabled storage / SecurityError — swallow and fall back.
    return null;
  }
}

function writeStoredSeedId(id: AccentSeedId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode / quota — silently ignore */
  }
}

// ---------------------------------------------------------------------------
// OKLCH → sRGB hex (inline helper for `--accent-hex`)
// ---------------------------------------------------------------------------
//
// Mirrors the conversion already used inside `material-accent.ts` for the
// contrast helper; kept private here so we don't have to re-export the
// internals of that module. Coefficients are the canonical Ottosson set
// (CSS Color 4 §13.4 / `culori`'s `convertOklabToLrgb`).

const DEG_TO_RAD = Math.PI / 180;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function oklchToLinearRgb({ l, s, h }: OklchColor): {
  r: number;
  g: number;
  b: number;
} {
  const hRad = h * DEG_TO_RAD;
  const a = s * Math.cos(hRad);
  const b = s * Math.sin(hRad);

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const lCubed = lPrime * lPrime * lPrime;
  const mCubed = mPrime * mPrime * mPrime;
  const sCubed = sPrime * sPrime * sPrime;

  const r = 4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
  const g = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
  const blue = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;

  return { r, g, b: blue };
}

function linearToSrgbComponent(c: number): number {
  // Standard sRGB inverse companding.
  const v = clamp01(c);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

function toHexByte(channel: number): string {
  const byte = Math.round(clamp01(channel) * 255);
  return byte.toString(16).padStart(2, "0");
}

/**
 * Resolves a CSS hex string (`#rrggbb`) for an OKLCH triplet. Out-of-gamut
 * values are clamped per channel — the same thing the browser does at
 * composite time — so the returned hex is always paintable.
 */
function oklchToHex(color: OklchColor): string {
  const linear = oklchToLinearRgb(color);
  const r = linearToSrgbComponent(linear.r);
  const g = linearToSrgbComponent(linear.g);
  const b = linearToSrgbComponent(linear.b);
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

// ---------------------------------------------------------------------------
// Theme detection — observe `documentElement.classList`
// ---------------------------------------------------------------------------

function readThemeFromDocument(): ThemeMode {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

// ---------------------------------------------------------------------------
// Apply CSS variables to `:root`
// ---------------------------------------------------------------------------

function applyAccentToRoot(seed: AccentSeed, theme: ThemeMode): void {
  if (typeof document === "undefined") return;

  const ring = resolveFocusRing(seed, theme);
  const hex = oklchToHex({ l: seed.l, s: seed.s, h: seed.h });
  const style = document.documentElement.style;

  // Numeric channels — the canonical OKLCH triplet (design.md §C.2).
  style.setProperty("--accent-h", `${seed.h}`);
  style.setProperty("--accent-s", `${seed.s}`);
  style.setProperty("--accent-l", `${seed.l}`);
  style.setProperty("--accent-hex", hex);

  // Derived tokens consumed by ring / ripple / halo surfaces.
  style.setProperty(
    "--ring-accent",
    `oklch(${ring.l} ${ring.s} ${ring.h})`,
  );
  style.setProperty(
    "--ripple-accent",
    `oklch(0.7 ${seed.s} ${seed.h} / 0.4)`,
  );
  style.setProperty(
    "--halo-stop-1",
    `oklch(0.7 ${seed.s} ${seed.h})`,
  );
  style.setProperty(
    "--halo-stop-2",
    `oklch(0.85 ${seed.s * 0.6} ${seed.h})`,
  );
}

function dispatchPaletteChanged(seed: AccentSeed): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(PALETTE_CHANGED_EVENT, { detail: { seedId: seed.id } }),
    );
  } catch {
    /* CustomEvent not constructible (very old environments) — ignore */
  }
}

// ---------------------------------------------------------------------------
// Context shape + hook
// ---------------------------------------------------------------------------

export interface MaterialAccentContextValue {
  /** The active seed object, never `undefined`. */
  readonly seed: AccentSeed;
  /** Activate a different seed by id. Unknown ids are ignored. */
  readonly setSeed: (id: AccentSeedId) => void;
  /** The full readonly seed table for swatchers / pickers. */
  readonly seeds: readonly AccentSeed[];
}

const MaterialAccentContext = createContext<
  MaterialAccentContextValue | undefined
>(undefined);

/**
 * Reads the active accent seed and exposes a setter. Must be called from a
 * component nested inside `<MaterialAccentProvider>`.
 */
export function useMaterialAccent(): MaterialAccentContextValue {
  const ctx = use(MaterialAccentContext);
  if (!ctx) {
    throw new Error(
      "useMaterialAccent must be used within a <MaterialAccentProvider>",
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface MaterialAccentProviderProps {
  children: ReactNode;
}

export function MaterialAccentProvider({
  children,
}: MaterialAccentProviderProps): ReactNode {
  // Initial state matches the SSR-rendered fallback so the first client
  // render does not desynchronise from the server output. The post-mount
  // effect below upgrades to the persisted seed.
  const [seed, setSeedState] = useState<AccentSeed>(DEFAULT_SEED);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  // Tracks whether the next state change should write back to localStorage.
  // Cross-tab `storage` events and the initial mount read should NOT echo
  // their value back, otherwise we would race with the originating tab.
  const skipPersistRef = useRef<boolean>(true);

  // Hydrate from localStorage + read the live theme on mount. Synchronous
  // post-mount work so the first painted frame already carries the user's
  // chosen seed instead of the default.
  useEffect(() => {
    const storedId = readStoredSeedId();
    if (storedId !== null && storedId !== seed.id) {
      const next = SEED_BY_ID.get(storedId);
      if (next) {
        skipPersistRef.current = true;
        setSeedState(next);
      }
    }
    const liveTheme = readThemeFromDocument();
    if (liveTheme !== theme) setTheme(liveTheme);
    // Intentionally one-shot: this is the post-mount hydration pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply CSS custom properties whenever the active seed or theme changes.
  // Theme changes only re-derive `--ring-accent`, but the cost of reapplying
  // the full block is negligible and keeps the apply path single-sourced.
  useEffect(() => {
    applyAccentToRoot(seed, theme);
    dispatchPaletteChanged(seed);
  }, [seed, theme]);

  // Persist seed changes to localStorage. Skipped for the initial hydration
  // and for cross-tab `storage`-driven updates.
  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    writeStoredSeedId(seed.id);
  }, [seed]);

  // Watch `<html>` class changes so theme flips re-derive the focus ring.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (typeof MutationObserver === "undefined") return;
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const next = readThemeFromDocument();
      setTheme((prev) => (prev === next ? prev : next));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Cross-tab sync — `storage` events fire in tabs other than the writer.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      // Validate the foreign value against the seed table before applying.
      const raw = event.newValue;
      const nextId =
        raw !== null && SEED_BY_ID.has(raw as AccentSeedId)
          ? (raw as AccentSeedId)
          : DEFAULT_SEED_ID;
      const next = SEED_BY_ID.get(nextId);
      if (!next) return;
      skipPersistRef.current = true;
      setSeedState((prev) => (prev.id === next.id ? prev : next));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setSeed = useCallback((id: AccentSeedId) => {
    const next = SEED_BY_ID.get(id);
    if (!next) return;
    setSeedState((prev) => (prev.id === next.id ? prev : next));
  }, []);

  const value = useMemo<MaterialAccentContextValue>(
    () => ({ seed, setSeed, seeds: PALETTE_SEEDS }),
    [seed, setSeed],
  );

  return createElement(
    MaterialAccentContext.Provider,
    { value },
    children,
  );
}
