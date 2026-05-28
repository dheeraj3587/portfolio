"use client";

/**
 * M3Snackbar — auto-dismissing snackbar primitive (task 13.1).
 *
 * Extracted from `component-gallery.tsx` (task 16.1) so each M3 primitive
 * lives in its own module and can be lazy-imported by `ComponentGallery`
 * via `next/dynamic({ ssr: false })`. The behavioural contract is unchanged.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { AnimatePresence, motion } from "motion/react";

import { usePressRipple } from "@/components/ui/ripple";
import { useReducedMotionState } from "@/lib/motion-engine";

const SNACKBAR_AUTODISMISS_MS = 3000;

/**
 * Renders a trigger button. On click, opens a snackbar that slides in from
 * the bottom and auto-dismisses after {@link SNACKBAR_AUTODISMISS_MS} ms.
 * Under reduced motion the snackbar still toggles visibility — only the
 * slide-in / slide-out is removed (Requirement 18.5).
 */
export function M3Snackbar(): ReactElement {
  const reduced = useReducedMotionState();
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { bind, ripples } = usePressRipple<HTMLButtonElement>();

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showSnackbar = useCallback((): void => {
    clearTimer();
    setOpen(true);
    timerRef.current = setTimeout(() => {
      setOpen(false);
      timerRef.current = null;
    }, SNACKBAR_AUTODISMISS_MS);
  }, [clearTimer]);

  // Make sure no timer survives an unmount.
  useEffect(() => clearTimer, [clearTimer]);

  return (
    <div className="relative inline-flex flex-col items-start gap-3">
      <button
        type="button"
        ref={bind.ref}
        onClick={showSnackbar}
        onPointerDown={bind.onPointerDown}
        onKeyDown={bind.onKeyDown}
        className="relative inline-flex items-center justify-center overflow-hidden rounded-full border border-[color:var(--border-strong)] px-5 py-2.5 font-sans text-sm font-medium text-foreground transition-colors duration-200 ease-out hover:bg-[color:var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ring-accent,currentColor)]"
      >
        Show snackbar
        {ripples}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="snackbar"
            role="status"
            aria-live="polite"
            initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={
              reduced
                ? { duration: 0 }
                : { type: "spring", stiffness: 320, damping: 30 }
            }
            className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card-solid)] px-4 py-3 font-sans text-sm text-foreground shadow-lg"
          >
            <span>Saved to drafts</span>
            <button
              type="button"
              onClick={() => {
                clearTimer();
                setOpen(false);
              }}
              className="rounded-full px-2 py-0.5 font-medium transition-colors duration-150 ease-out hover:bg-[color:var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ring-accent,currentColor)]"
              style={{ color: "var(--accent-hex, var(--foreground))" }}
            >
              Undo
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default M3Snackbar;
