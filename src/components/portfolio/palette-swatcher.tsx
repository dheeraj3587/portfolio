"use client";

/**
 * Palette_Swatcher (Task 2.5).
 *
 * A live Material You-style accent picker. Each swatch is a circular
 * button that activates one of the seeds in `PALETTE_SEEDS`
 * (Requirement 11.1). Activation flows through `useMaterialAccent.setSeed`
 * which writes the OKLCH triplet onto `:root` so the hero halo, focus
 * rings, and ripple color all retint within 250ms by virtue of the
 * `:root { transition: ... 250ms; }` rule declared in §15
 * (Requirement 11.3).
 *
 * Accessibility contracts:
 *
 *   • `<div role="radiogroup" aria-label="Accent color">` wraps the
 *     swatches so assistive tech announces the group context.
 *   • Each swatch carries an `aria-label` equal to the seed display name
 *     (Requirement 11.6) and `aria-pressed` to mark the active seed —
 *     per the task spec we use `aria-pressed` rather than the
 *     `role="radio" aria-checked` alternative.
 *   • The active seed also renders a checkmark glyph so the active
 *     state is not communicated by color alone (Requirement 17.7).
 *   • The visible focus ring uses `var(--ring-accent)` (Requirement
 *     17.4 / 17.5).
 *   • Mobile touch targets meet 44×44 px in the menu layout (used
 *     inside `Scroll_Island_Nav` under 768 px) per Requirement 15.4.
 *
 * Layout variants:
 *
 *   • `"header"` — compact horizontal row; ~32 px diameter swatches,
 *     intended for `Site_Header` on ≥768 px viewports.
 *   • `"menu"`   — larger 44 px swatches, intended for the
 *     `Scroll_Island_Nav` dropdown.
 */

import {
  useCallback,
  type ReactElement,
  type CSSProperties,
} from "react";

import { usePressRipple } from "@/components/ui/ripple";
import {
  type AccentSeed,
  type AccentSeedId,
} from "@/lib/theme/material-accent";
import { useMaterialAccent } from "@/lib/theme/use-material-accent";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Public props
// ---------------------------------------------------------------------------

export type PaletteSwatcherLayout = "header" | "menu";

export interface PaletteSwatcherProps {
  /**
   * Compact form for the `Site_Header`, expanded form for
   * `Scroll_Island_Nav` (Requirement 11.2).
   */
  readonly layout: PaletteSwatcherLayout;
  /** Optional class hook for the wrapping `radiogroup` container. */
  readonly className?: string;
}

// ---------------------------------------------------------------------------
// Layout tables
// ---------------------------------------------------------------------------

interface LayoutTokens {
  /** Tailwind classes for the `<div role="radiogroup">` wrapper. */
  readonly group: string;
  /** Tailwind classes applied to every swatch button. */
  readonly button: string;
  /** Tailwind classes for the active-state checkmark glyph. */
  readonly check: string;
}

const LAYOUTS: Readonly<Record<PaletteSwatcherLayout, LayoutTokens>> = {
  header: {
    // Tight row — header lives on ≥768px so we don't need the 44px hit.
    group: "flex items-center gap-2",
    button: "size-8",
    check: "size-3.5",
  },
  menu: {
    // Larger swatches that already clear the 44×44 mobile touch target
    // (Requirement 15.4); also wraps so a future 5th seed survives a
    // narrow island width.
    group: "flex flex-wrap items-center gap-3",
    button: "size-11 min-h-11 min-w-11",
    check: "size-4",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the inline `background-color` for a swatch from its OKLCH triplet.
 * Kept as a `style` prop rather than a Tailwind arbitrary value so it stays
 * legible and there is no class-string concatenation cost per render.
 */
function swatchBackgroundStyle(seed: AccentSeed): CSSProperties {
  return { backgroundColor: `oklch(${seed.l} ${seed.s} ${seed.h})` };
}

// ---------------------------------------------------------------------------
// <Swatch /> — a single circular button + ripple
// ---------------------------------------------------------------------------

interface SwatchProps {
  readonly seed: AccentSeed;
  readonly active: boolean;
  readonly onActivate: (id: AccentSeedId) => void;
  readonly tokens: LayoutTokens;
}

/**
 * Single seed swatch. Pulled out as its own component so each swatch
 * gets its own `usePressRipple()` instance — the hook owns ripple state
 * and we want presses on one swatch to never leak into another.
 */
function Swatch({
  seed,
  active,
  onActivate,
  tokens,
}: SwatchProps): ReactElement {
  const { bind, ripples } = usePressRipple<HTMLButtonElement>();
  const handleClick = useCallback(() => {
    onActivate(seed.id);
  }, [onActivate, seed.id]);

  return (
    <button
      ref={bind.ref}
      onPointerDown={bind.onPointerDown}
      onKeyDown={bind.onKeyDown}
      onClick={handleClick}
      type="button"
      aria-label={seed.name}
      aria-pressed={active}
      data-seed-id={seed.id}
      data-active={active ? "true" : undefined}
      style={swatchBackgroundStyle(seed)}
      className={cn(
        // Layout + shape.
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        // Subtle border so very light seeds (mono-graphite-light) are
        // still discoverable on a light background.
        "border border-black/10 dark:border-white/15",
        // Visible focus ring per §15 / Requirement 17.4. Uses the live
        // `--ring-accent` token so it tracks the active seed/theme.
        "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring-accent)]",
        // Hover affordance on fine pointers — purely decorative.
        "transition-transform duration-200 ease-out hover:-translate-y-0.5",
        tokens.button,
      )}
    >
      {/* Checkmark glyph for the active state — non-color cue per Req 17.7. */}
      {active ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "relative z-[1] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]",
            tokens.check,
          )}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : null}
      {ripples}
    </button>
  );
}

// ---------------------------------------------------------------------------
// <PaletteSwatcher /> — the public component
// ---------------------------------------------------------------------------

/**
 * Render the live accent picker. See module docblock for accessibility +
 * layout contracts.
 */
export function PaletteSwatcher({
  layout,
  className,
}: PaletteSwatcherProps): ReactElement {
  const { seed: activeSeed, seeds, setSeed } = useMaterialAccent();
  const tokens = LAYOUTS[layout];

  return (
    <div
      role="radiogroup"
      aria-label="Accent color"
      data-palette-swatcher={layout}
      className={cn(tokens.group, className)}
    >
      {seeds.map((seed) => (
        <Swatch
          key={seed.id}
          seed={seed}
          active={seed.id === activeSeed.id}
          onActivate={setSeed}
          tokens={tokens}
        />
      ))}
    </div>
  );
}

export default PaletteSwatcher;
