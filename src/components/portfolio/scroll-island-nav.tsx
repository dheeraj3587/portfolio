"use client";

/**
 * Scroll_Island_Nav — floating Dynamic Island-style section nav (Task 10.2,
 * Requirements 9.4, 11.2, 14.1–14.7, 17.5, 17.7, 19.5).
 *
 * The island is the **reader** half of the active-section pair. The
 * `Section_Rail` writes to `activeSectionStore` through its
 * `IntersectionObserver`; the island consumes `useActiveSection(SECTION_IDS)`
 * so both surfaces resolve to the same id on every render tick (Requirement
 * 9.4 / 19.5). There is no second IntersectionObserver here — that
 * "duel" between two observers is exactly the desync the shared store was
 * built to remove (design.md §C.6).
 *
 * Visual model
 * ────────────
 *   ┌──────────────────────────────────────────────┐
 *   │  [○]  Index  ▾                          42%  │   ← collapsed pill (≥480 px)
 *   └──────────────────────────────────────────────┘
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  [○]  Index  ▴                          42%  │
 *   ├──────────────────────────────────────────────┤
 *   │   Home                                     ● │   ← active item carries
 *   │   Tech Stack                                 │      a non-color dot
 *   │   Projects                                   │      (Req 17.7)
 *   │   Experience                                 │
 *   │   Contact                                    │
 *   ├──────────────────────────────────────────────┤
 *   │   <PaletteSwatcher layout="menu" />          │   ← only renders <768 px
 *   └──────────────────────────────────────────────┘      (Req 11.2)
 *
 * Reduced motion (Requirement 14.7)
 *   • Dropdown spring is replaced with `duration: 0` so opening / closing
 *     is instant.
 *   • Section selection uses `behavior: "auto"` (instant) instead of
 *     `behavior: "smooth"`.
 *   • Heading focus runs immediately rather than waiting for the smooth-
 *     scroll settle window.
 *
 * Focus trap (Requirement 14.6)
 *   The dropdown's `useFocusTrap` is engaged for the entire time the panel
 *   is mounted in the DOM — that includes the open animation, the steady
 *   open state, AND the close animation. Releasing the trap is gated on
 *   `<AnimatePresence onExitComplete>` so focus cannot leak while the
 *   panel is still painting.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { ChevronDown } from "lucide-react";

import {
  SECTION_IDS,
  type SectionId,
} from "@/components/portfolio/active-section-store";
import { useActiveSection } from "@/lib/scroll/use-active-section";
import {
  motionVariants,
  useReducedMotionState,
} from "@/lib/motion-engine";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { PaletteSwatcher } from "@/components/portfolio/palette-swatcher";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Section catalog
// ---------------------------------------------------------------------------

interface SectionEntry {
  /** Element id targeted by `scrollIntoView` and `useActiveSection`. */
  readonly id: SectionId;
  /** Visible label rendered in the dropdown. */
  readonly title: string;
}

/**
 * Order matches `SECTION_IDS` in `active-section-store.ts`, which mirrors
 * document order. The dropdown enumerates the sections in this order so
 * keyboard tabbing through the menu walks the page top-to-bottom.
 */
const ENTRIES: readonly SectionEntry[] = [
  { id: "home", title: "Home" },
  { id: "components", title: "Tech Stack" },
  { id: "projects", title: "Projects" },
  { id: "experience", title: "Experience" },
  { id: "contact", title: "Contact" },
];

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/**
 * Spring used to animate the dropdown expansion. The shape settles in
 * ~280 ms which leaves comfortable headroom under the 400 ms ceiling
 * required by Requirement 14.3.
 */
const ISLAND_SPRING = {
  type: "spring" as const,
  stiffness: 320,
  damping: 30,
  mass: 0.7,
};

/**
 * Smooth-scroll settle window before keyboard focus is moved to the
 * destination heading (Requirement 14.5). Browsers typically finish a
 * `scrollIntoView({ behavior: "smooth" })` within 500–700 ms, so 600 ms
 * is a safe tap-out point. Under reduced motion this delay is skipped
 * entirely (Requirement 14.7).
 */
const SMOOTH_SCROLL_SETTLE_MS = 600;

/**
 * Spring shaping the percentage display's perceived lag. Stiffness is
 * tuned so visible updates land within ~80 ms of a scroll tick — well
 * under the 100 ms ceiling required by Requirement 14.2.
 */
const PERCENT_SPRING = {
  stiffness: 260,
  damping: 28,
  mass: 0.4,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the destination focus target for keyboard activation: the
 * section's first `<h1>` or `<h2>`, falling back to the section element
 * itself. The returned element is augmented with `tabindex="-1"` so
 * `.focus()` succeeds on otherwise non-focusable headings.
 */
function resolveFocusTarget(section: HTMLElement): HTMLElement {
  const heading = section.querySelector<HTMLElement>("h1, h2");
  const target = heading ?? section;
  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }
  return target;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScrollIslandNav() {
  const reduced = useReducedMotionState();

  // Single source of truth for the active section — the rail's observer
  // is the writer; we only read.
  const activeId = useActiveSection(SECTION_IDS);

  // `open` is the user-visible state of the dropdown. `mountedDropdown`
  // tracks whether the panel is still in the DOM (open or animating
  // closed). The focus trap follows `mountedDropdown` so it holds
  // through the entire close animation per Requirement 14.6. We flip
  // `mountedDropdown` directly inside the click handler (so it never
  // chases `open` from inside an effect) and reset it from
  // `<AnimatePresence onExitComplete>` once the close animation is
  // done painting.
  const [open, setOpen] = useState(false);
  const [mountedDropdown, setMountedDropdown] = useState(false);

  const openDropdown = useCallback(() => {
    setMountedDropdown(true);
    setOpen(true);
  }, []);
  const closeDropdown = useCallback(() => {
    setOpen(false);
  }, []);

  // Portal mount gate. The island is rendered into `document.body` so
  // the fixed positioning is not affected by ancestor `transform`
  // contexts; the gate prevents the SSR pass from emitting markup that
  // does not exist on the server. The flip happens inside a
  // `requestAnimationFrame` callback rather than the effect body so
  // React doesn't see a synchronous setState during commit.
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const rafId = window.requestAnimationFrame(() => setPortalReady(true));
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Scroll progress → percentage display ────────────────────────────
  // `useScroll()` reads the document's main scroll position. We pass it
  // through a gentle spring so micro scroll jitter doesn't ping-pong
  // the displayed integer; under reduced motion the spring is bypassed
  // and the raw progress flows through unchanged.
  const { scrollYProgress } = useScroll();
  const smoothedProgress = useSpring(scrollYProgress, PERCENT_SPRING);
  const progressSource = reduced ? scrollYProgress : smoothedProgress;
  const percentMotionValue = useTransform(progressSource, (raw) => {
    if (!Number.isFinite(raw)) return 0;
    const clamped = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    return Math.round(clamped * 100);
  });

  // Render the integer through React state so the `Math.round`-stable
  // value is what re-renders the label, not every sub-pixel motion tick.
  // `useMotionValueEvent` is the supported way to bridge a motion value
  // to React state (motion docs: "Hooks → useMotionValueEvent").
  const [percent, setPercent] = useState(0);
  useMotionValueEvent(percentMotionValue, "change", (latest) => {
    setPercent(latest);
  });

  // ── Focus trap (Requirement 14.6) ───────────────────────────────────
  useFocusTrap(dropdownRef, {
    active: mountedDropdown,
    onEscape: closeDropdown,
  });

  // ── Section selection ──────────────────────────────────────────────
  const handleSelect = useCallback(
    (id: SectionId, kind: "keyboard" | "pointer") => {
      const el = document.getElementById(id);
      // Always close the dropdown — whether or not the section resolved.
      closeDropdown();
      if (!el) return;

      // Smooth scroll under normal motion; instant under reduced motion
      // (Requirement 14.7). The destination's `scroll-margin-top`
      // already accounts for the pinned nav height (set on the section
      // elements; see `scroll-mt-32` etc. in profile-section.tsx,
      // component-gallery.tsx, etc.) so a single `block: "start"`
      // alignment lands the section title under the island rather than
      // tucked behind it (Requirement 14.4).
      el.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });

      // Keyboard activation moves focus to the section's primary
      // heading once the scroll has settled (Requirement 14.5). Pointer
      // activation skips the focus jump — the user already knows where
      // they are, and yanking focus on a click would be surprising.
      if (kind !== "keyboard") return;
      const focusTarget = resolveFocusTarget(el);
      if (reduced) {
        focusTarget.focus({ preventScroll: true });
        return;
      }
      window.setTimeout(() => {
        focusTarget.focus({ preventScroll: true });
      }, SMOOTH_SCROLL_SETTLE_MS);
    },
    [reduced, closeDropdown],
  );

  // ── UI ──────────────────────────────────────────────────────────────
  const islandUI = (
    <>
      {/* Backdrop — captures outside-click / outside-tap dismissal
          (Requirement 14.6). Uses its own AnimatePresence so it can
          fade in/out independent of the panel's spring. */}
      <AnimatePresence>
        {open ? (
          <motion.div
            key="scroll-island-nav-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2 }}
            onClick={closeDropdown}
            aria-hidden="true"
            className="fixed inset-0 z-[9998] bg-background/40 backdrop-blur-sm"
          />
        ) : null}
      </AnimatePresence>

      {/* Pinned positioning frame.
          `min-[480px]:flex` satisfies Requirement 14.1 — the island
          shows on viewports ≥480 px and hides on narrower screens
          where the section index is not surfaced (Requirement 9.6
          delegates indication entirely to the island below 640 px,
          and below 480 px the chrome is too small to be useful). */}
      <div className="theme-injected pointer-events-none fixed top-4 left-0 z-[9999] hidden w-full justify-center min-[480px]:flex sm:top-5">
        <motion.div
          ref={dropdownRef}
          // The spring drives width / radius for the Dynamic Island
          // expansion. `layout` would re-run on every child mount; we
          // want a single contained pill so we animate the wrapper
          // dimensions explicitly instead.
          initial={false}
          animate={{
            width: open ? 360 : 240,
            borderRadius: open ? 24 : 32,
          }}
          transition={reduced ? { duration: 0 } : ISLAND_SPRING}
          className="border-border bg-background pointer-events-auto flex flex-col items-stretch overflow-hidden border shadow-2xl"
        >
          <button
            type="button"
            aria-expanded={open}
            aria-controls="scroll-island-nav-panel"
            aria-label={open ? "Close section index" : "Open section index"}
            onClick={() => (open ? closeDropdown() : openDropdown())}
            className="group flex h-[3.25rem] w-full cursor-pointer select-none items-center justify-between gap-4 px-4"
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="relative h-7 w-7 shrink-0 rounded-full"
                style={{
                  background: `conic-gradient(var(--foreground) 0% ${percent}%, color-mix(in oklch, var(--muted-foreground) 30%, transparent) ${percent}% 100%)`,
                }}
              >
                <span className="bg-background absolute inset-[2.5px] rounded-full" />
              </span>
              <span className="text-foreground text-base font-medium">
                Index
              </span>
              <motion.span
                animate={{ rotate: open ? 180 : 0 }}
                transition={reduced ? { duration: 0 } : ISLAND_SPRING}
                className="text-muted-foreground inline-flex"
              >
                <ChevronDown size={18} aria-hidden="true" />
              </motion.span>
            </span>
            <span
              className="bg-muted text-foreground rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums"
              data-progress-percent={percent}
              aria-label={`Page scroll progress: ${percent} percent`}
            >
              {percent}%
            </span>
          </button>

          <AnimatePresence
            initial={false}
            onExitComplete={() => setMountedDropdown(false)}
          >
            {open ? (
              <motion.div
                id="scroll-island-nav-panel"
                key="scroll-island-nav-panel"
                role="menu"
                aria-label="Section index"
                // `motionVariants.sharedAxis` provides the M3-flavoured
                // x-translate + opacity exchange. We override the
                // transition with the island spring so the panel
                // settles within Requirement 14.3's 400 ms budget.
                variants={motionVariants.sharedAxis}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={
                  reduced
                    ? { duration: 0 }
                    : { ...ISLAND_SPRING, restDelta: 0.5 }
                }
                className="flex flex-col gap-2 px-2 pb-3"
              >
                <ul className="flex flex-col" role="none">
                  {ENTRIES.map((entry) => {
                    const isActive = activeId === entry.id;
                    return (
                      <li key={entry.id} role="none">
                        <button
                          type="button"
                          role="menuitem"
                          aria-current={isActive ? "true" : undefined}
                          onClick={(event) => {
                            // `event.detail === 0` is the standard cue
                            // that the button was activated via keyboard
                            // (Enter / Space) rather than a pointer
                            // click — the value reflects how many times
                            // the button was clicked in succession, and
                            // keyboard activations report 0.
                            const kind: "keyboard" | "pointer" =
                              event.detail === 0 ? "keyboard" : "pointer";
                            handleSelect(entry.id, kind);
                          }}
                          className={cn(
                            "flex w-full min-h-11 items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                            // Focus ring tracks the live accent so
                            // keyboard navigation stays visible across
                            // palette changes (Requirement 17.4).
                            "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ring-accent,currentColor)]",
                            isActive
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <span className="truncate">{entry.title}</span>
                          {/* Non-color cue for the active item —
                              communicates state via shape so users who
                              can't perceive the accent fill still see
                              which section is current (Req 17.7). */}
                          {isActive ? (
                            <span
                              aria-hidden="true"
                              className="ml-2 inline-block size-1.5 rounded-full bg-current"
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* Palette swatcher renders inside the dropdown only on
                    viewports < 768 px (Requirement 11.2). The header
                    surfaces the swatcher on ≥768 px instead, so this
                    branch is the mobile entry point. */}
                <div className="border-border mt-1 border-t px-1 pt-3 md:hidden">
                  <PaletteSwatcher layout="menu" />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );

  if (!portalReady) return null;
  return createPortal(islandUI, document.body);
}
