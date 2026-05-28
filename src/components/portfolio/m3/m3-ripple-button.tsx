"use client";

/**
 * M3RippleButton — bare text button used to demo the press-ripple primitive
 * on its own (task 13.1).
 *
 * Extracted from `component-gallery.tsx` (task 16.1) so each M3 primitive
 * lives in its own module and can be lazy-imported by `ComponentGallery`
 * via `next/dynamic({ ssr: false })`. The behavioural contract is unchanged.
 */

import type { ReactElement } from "react";

import { usePressRipple } from "@/components/ui/ripple";

/**
 * Standard outlined text button. Exists to demo the press-ripple primitive
 * on its own surface — no accent fill, no extra chrome.
 */
export function M3RippleButton(): ReactElement {
  const { bind, ripples } = usePressRipple<HTMLButtonElement>();
  return (
    <button
      type="button"
      ref={bind.ref}
      onPointerDown={bind.onPointerDown}
      onKeyDown={bind.onKeyDown}
      className="relative inline-flex items-center justify-center overflow-hidden rounded-full border border-[color:var(--border-strong)] px-5 py-2.5 font-sans text-sm font-medium text-foreground transition-colors duration-200 ease-out hover:bg-[color:var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ring-accent,currentColor)]"
    >
      Press me
      {ripples}
    </button>
  );
}

export default M3RippleButton;
