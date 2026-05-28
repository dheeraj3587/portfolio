"use client";

/**
 * M3Switch — Material 3 switch primitive (task 13.1).
 *
 * Extracted from `component-gallery.tsx` (task 16.1) so each M3 primitive
 * lives in its own module and can be lazy-imported by `ComponentGallery`
 * via `next/dynamic({ ssr: false })`. The behavioural contract is unchanged.
 */

import { useCallback, useState, type ReactElement } from "react";
import { motion } from "motion/react";

import { usePressRipple } from "@/components/ui/ripple";
import { useReducedMotionState } from "@/lib/motion-engine";

/**
 * Material 3 switch. Track tint flips between `--accent-hex` and the
 * neutral surface; the thumb slides 22 px when toggled. Under reduced
 * motion the state still flips — only the slide animation is dropped
 * (Requirement 18.5).
 */
export function M3Switch(): ReactElement {
  const reduced = useReducedMotionState();
  const [on, setOn] = useState(false);
  const { bind, ripples } = usePressRipple<HTMLButtonElement>();

  const handleClick = useCallback(() => setOn((v) => !v), []);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Demo switch"
      ref={bind.ref}
      onClick={handleClick}
      onPointerDown={bind.onPointerDown}
      onKeyDown={bind.onKeyDown}
      className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-[color:var(--border)] p-0.5 transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ring-accent,currentColor)]"
      style={{
        backgroundColor: on
          ? "var(--accent-hex, var(--foreground))"
          : "var(--muted)",
      }}
    >
      <motion.span
        aria-hidden="true"
        className="block size-6 rounded-full bg-white shadow-sm"
        animate={reduced ? false : { x: on ? 22 : 0 }}
        initial={false}
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 320, damping: 28 }
        }
        style={reduced ? { transform: `translateX(${on ? 22 : 0}px)` } : undefined}
      />
      {ripples}
    </button>
  );
}

export default M3Switch;
