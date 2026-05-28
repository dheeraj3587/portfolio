"use client";

/**
 * M3FAB — extended floating action button primitive (task 13.1).
 *
 * Extracted from `component-gallery.tsx` (task 16.1) so each M3 primitive
 * lives in its own module and can be lazy-imported by `ComponentGallery`
 * via `next/dynamic({ ssr: false })`. The behavioural contract is unchanged.
 */

import type { ReactElement } from "react";
import { Plus } from "lucide-react";

import { usePressRipple } from "@/components/ui/ripple";

/**
 * 56×56 circular floating action button. Carries the page accent colour
 * (`--accent-hex`) on its surface and the press-ripple accent
 * (`--ripple-accent`) on its overlay.
 */
export function M3FAB(): ReactElement {
  const { bind, ripples } = usePressRipple<HTMLButtonElement>();
  return (
    <button
      type="button"
      ref={bind.ref}
      onPointerDown={bind.onPointerDown}
      onKeyDown={bind.onKeyDown}
      aria-label="Create"
      className="relative grid size-14 place-items-center overflow-hidden rounded-full text-white shadow-md transition-shadow duration-200 ease-out hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ring-accent,currentColor)]"
      style={{
        backgroundColor: "var(--accent-hex, var(--foreground))",
      }}
    >
      <Plus className="size-6" aria-hidden="true" />
      {ripples}
    </button>
  );
}

export default M3FAB;
