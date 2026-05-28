"use client";

/**
 * M3Chip — Material 3 assist chip primitive (task 13.1).
 *
 * Extracted from `component-gallery.tsx` (task 16.1) so each M3 primitive
 * lives in its own module and can be lazy-imported by `ComponentGallery`
 * via `next/dynamic({ ssr: false })`. The behavioural contract is unchanged.
 */

import { useCallback, useState, type ReactElement } from "react";
import { Check } from "lucide-react";

import { usePressRipple } from "@/components/ui/ripple";

/**
 * Pill-shaped assist chip. Click toggles between selected and idle; the
 * selected state lifts the chip onto an accent surface and shows a leading
 * checkmark.
 */
export function M3Chip(): ReactElement {
  const [selected, setSelected] = useState(false);
  const { bind, ripples } = usePressRipple<HTMLButtonElement>();

  const handleClick = useCallback(() => setSelected((v) => !v), []);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      ref={bind.ref}
      onClick={handleClick}
      onPointerDown={bind.onPointerDown}
      onKeyDown={bind.onKeyDown}
      className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-[color:var(--border-strong)] px-4 py-2 font-sans text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ring-accent,currentColor)]"
      style={{
        backgroundColor: selected
          ? "color-mix(in oklab, var(--accent-hex, var(--foreground)) 18%, transparent)"
          : "transparent",
        borderColor: selected
          ? "color-mix(in oklab, var(--accent-hex, var(--foreground)) 45%, var(--border-strong))"
          : undefined,
        color: "var(--foreground)",
      }}
    >
      {selected ? (
        <Check
          aria-hidden="true"
          className="size-4"
          style={{ color: "var(--accent-hex, var(--foreground))" }}
        />
      ) : null}
      <span>Material</span>
      {ripples}
    </button>
  );
}

export default M3Chip;
