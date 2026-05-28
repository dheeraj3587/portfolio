"use client";

/**
 * Section_Rail — single fixed thin rail that visually links the page's
 * primary sections (Task 10.1, Requirements 9.1–9.6, 17.7).
 *
 * The rail is **the writer** of `activeSectionStore`. An
 * `IntersectionObserver` on each section listed in `SECTION_IDS` reports
 * which section the user is currently looking at; the rail publishes the
 * id to the store, and `Scroll_Island_Nav` subscribes to the same store
 * via `useActiveSection`. By construction both consumers see the same
 * id on the same render tick (Requirement 9.4 / 19.5).
 *
 * Visual model
 * ────────────
 *   ┌──────────────────────────────────────────────┬──┐
 *   │  hero                                        │  │   ← unfilled track (2 px)
 *   │  device showcase                             │██│   ← filled track  (scaleY = scrollYProgress)
 *   │  projects                                    │██│
 *   │  experience                                  │██│   ← active highlight
 *   │  contact                                     │  │      (top + height track the active
 *   │                                              │  │       section's bounding rect, width
 *   └──────────────────────────────────────────────┴──┘       thickens — Requirement 17.7)
 *
 * Layout (Requirement 9.6)
 *   • ≥1024 px  — pinned to the right edge.
 *   • 640–1023  — pinned to the left edge.
 *   • <640 px   — hidden; section indication is delegated to the island.
 *
 * Reduced motion (Requirement 9.5)
 *   The filled track and the highlight segment update **instantly** when
 *   `Reduced_Motion_State` is true: no spring on the segment's `top` /
 *   `height` and no easing on the fill. The segment still tracks the
 *   active section so the active state is perceivable; only the easing
 *   is skipped.
 *
 * Color-independent active state (Requirement 17.7)
 *   The highlighted segment is communicated by **width** as well as
 *   color. The base track is 2 px; the active segment renders at 5 px
 *   so users who can't perceive the accent color (low-vision,
 *   colorblind, monochrome environments) still see the active section
 *   indicated by a thicker rectangle.
 */

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";

import {
  SECTION_IDS,
  activeSectionStore,
  type SectionId,
} from "@/components/portfolio/active-section-store";
import { useActiveSection } from "@/lib/scroll/use-active-section";
import { useReducedMotionState } from "@/lib/motion-engine";

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/**
 * `IntersectionObserver` margin used to flip the active section. The top
 * 40 % and bottom 55 % of the viewport are masked off so a section is
 * "active" only while its body sits in the central 5 % band of the
 * viewport. This matches the design.md §Section_Rail spec and keeps the
 * active id stable while the user dwells on a section rather than
 * thrashing between two adjacent sections at section boundaries.
 */
const OBSERVER_ROOT_MARGIN = "-40% 0px -55% 0px";

/**
 * Spring that drives the highlight segment's `top` / `height` so the
 * transition between sections completes within 300 ms (Requirement 9.3).
 * The shape mirrors `SHARED_SPRING` (motion-engine.ts) but is tightened
 * slightly so the settle window is comfortably under 300 ms with no
 * overshoot past the section's bounds.
 */
const SEGMENT_SPRING = {
  stiffness: 320,
  damping: 32,
  mass: 0.7,
} as const;

/**
 * Track width in pixels. The base 2 px line matches the design.md spec;
 * the highlight thickens to {@link ACTIVE_SEGMENT_WIDTH_PX} so the
 * active state is communicated by width rather than color alone
 * (Requirement 17.7).
 */
const TRACK_WIDTH_PX = 2;
const ACTIVE_SEGMENT_WIDTH_PX = 5;

// ---------------------------------------------------------------------------
// Active-section observer
// ---------------------------------------------------------------------------

/**
 * Wires an `IntersectionObserver` on every element matching the ids in
 * `SECTION_IDS` and publishes the active id to `activeSectionStore`.
 *
 * The observer fires whenever a section's intersection ratio crosses
 * one of the configured thresholds. We collect the id with the largest
 * intersecting share and call `activeSectionStore.setActive(id)`. When
 * no section is intersecting (e.g. the user is between sections or
 * scrolling past the footer) the active id is left unchanged so the
 * rail's highlight does not flicker off.
 */
function useObserveActiveSection(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") return;

    // Resolve elements once on mount. Sections that aren't in the DOM
    // yet (e.g. lazy-mounted under reduced motion) are silently skipped
    // — they'll simply never publish until the page reloads. The store
    // tolerates an absent id, so this is safe.
    const elements: { id: SectionId; el: Element }[] = [];
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) elements.push({ id, el });
    }
    if (elements.length === 0) return;

    /**
     * Tracks each section's most recent `intersectionRatio` so we can
     * pick the section with the largest intersection share whenever the
     * observer fires. Without this snapshot we'd have to read the
     * boundingClientRect of every section on every callback, which is
     * what `IntersectionObserver` is meant to avoid.
     */
    const ratioById = new Map<SectionId, number>();
    for (const { id } of elements) ratioById.set(id, 0);

    const elementToId = new Map<Element, SectionId>();
    for (const { id, el } of elements) elementToId.set(el, id);

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        const id = elementToId.get(entry.target);
        if (!id) continue;
        ratioById.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
      }
      // Pick the section with the largest intersection share. Ties go to
      // the first id in `SECTION_IDS` order, which mirrors document
      // order on the page.
      let bestId: SectionId | null = null;
      let bestRatio = 0;
      for (const id of SECTION_IDS) {
        const ratio = ratioById.get(id) ?? 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      }
      if (bestId !== null) {
        activeSectionStore.setActive(bestId);
      }
    };

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: OBSERVER_ROOT_MARGIN,
      // Multiple thresholds so the active id flips smoothly as the user
      // scrolls between two sections that briefly intersect together.
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    });
    for (const { el } of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);
}

// ---------------------------------------------------------------------------
// Highlight rect tracking
// ---------------------------------------------------------------------------

interface HighlightRect {
  /** Viewport-space top of the active section, in CSS pixels. */
  top: number;
  /** Active section's height, in CSS pixels. */
  height: number;
}

/**
 * Returns the **viewport-space** bounding rect of the section element
 * matching `activeId`. The rail itself is `position: fixed`, so the
 * highlight's `top` is read directly from `getBoundingClientRect()` —
 * no `window.scrollY` arithmetic is needed.
 *
 * The hook re-measures whenever:
 *   • the active id changes (a new section took over),
 *   • the window scrolls (the active section's top moves with the page),
 *   • the window resizes (layout reflow may change the section's height).
 *
 * Returns `null` until a measurement is available so the highlight
 * segment can be conditionally rendered (avoids a frame at `top: 0,
 * height: 0` on first commit).
 */
function useActiveSectionRect(activeId: SectionId | null): HighlightRect | null {
  const [rect, setRect] = useState<HighlightRect | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Schedule clears and the initial measurement on the next animation
    // frame so the effect body never calls `setRect` synchronously. This
    // keeps React's effect → render pipeline single-pass and matches
    // the React 19 guidance against cascading renders inside effects.
    if (activeId === null) {
      const rafId = window.requestAnimationFrame(() => setRect(null));
      return () => window.cancelAnimationFrame(rafId);
    }
    const el = document.getElementById(activeId);
    if (!el) {
      const rafId = window.requestAnimationFrame(() => setRect(null));
      return () => window.cancelAnimationFrame(rafId);
    }

    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, height: r.height });
    };
    // Initial measurement runs in the next frame rather than the effect
    // body so the very first paint has rect=null and the highlight
    // segment fades in once we know where to put it.
    const initialRafId = window.requestAnimationFrame(measure);

    // Both listeners are passive; they only sample the existing rect and
    // never trigger layout themselves. `ResizeObserver` covers the case
    // where the section's content reflows without a window resize (e.g.
    // images loading inside the projects grid).
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    ro?.observe(el);

    return () => {
      window.cancelAnimationFrame(initialRafId);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [activeId]);

  return rect;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SectionRail() {
  const reduced = useReducedMotionState();

  // Subscribe to the same store the island reads. The hook returns
  // `null` until the observer publishes its first id, which keeps the
  // highlight segment hidden until we have something meaningful to
  // point at.
  const activeId = useActiveSection(SECTION_IDS);

  // Install the IntersectionObserver writer. This is the only side
  // effect that mutates `activeSectionStore`; the island is read-only.
  useObserveActiveSection();

  // Window scroll progress ∈ [0, 1] for the filled track. `useScroll()`
  // with no arguments listens to the document's main scroll position,
  // which is exactly what the rail's vertical fill should track
  // (Requirement 9.2).
  const { scrollYProgress } = useScroll();

  // Under reduced motion the fill snaps directly to `scrollYProgress`
  // with no easing. Otherwise we run it through a gentle spring so the
  // fill keeps up with rapid scrolls without jittering on every tick.
  const smoothedProgress = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 30,
    mass: 0.5,
  });
  const fillScaleY = reduced ? scrollYProgress : smoothedProgress;

  // The filled track is rendered at full height with `scaleY` driving
  // its visible length. `transformOrigin: top` so it grows downward.
  // Tying scaleY to a number in [0, 1] means a 100 vh-tall track always
  // fills proportionally, with no measurement of total document height
  // required.
  const opacity = useTransform(scrollYProgress, [0, 0.001, 1], [0, 1, 1]);

  const rect = useActiveSectionRect(activeId);

  return (
    <aside
      // The rail is decorative — it visualises a state that's already
      // exposed by the labelled `<section>` headings. Marking it
      // `aria-hidden` prevents screen readers from announcing the
      // ambient progress indicator on every scroll tick (Requirement
      // 17.6 still applies to focusable / labelled content; this
      // element is neither).
      aria-hidden="true"
      data-section-rail
      className={[
        // Visibility per Requirement 9.6.
        "hidden sm:block",
        // Pinned full-height column on the side of the viewport.
        "fixed top-0 bottom-0 z-30",
        // Thin reserved column. The actual visible track is rendered
        // inside via the absolutely-positioned children.
        "w-1.5",
        // Edge placement: right edge ≥1024 px, left edge 640–1023 px.
        // Tailwind's `lg:` breakpoint is 1024 px and `sm:` is 640 px,
        // which matches the design.md §Section_Rail and Requirement
        // 9.6 thresholds. `lg:left-auto` undoes the small-screen
        // `sm:left-2` so the column docks on the right at lg+.
        "sm:left-2 lg:left-auto lg:right-3",
        // Fallback color so children that resolve `currentColor`
        // (when `--ring-accent` / `--accent-hex` haven't been written
        // yet by the palette provider) read the foreground tone.
        "text-foreground",
        // Clip the highlight segment so it doesn't paint past the
        // viewport edges during the spring overshoot.
        "overflow-hidden",
        // Pointer-transparent so the rail never eats clicks meant for
        // page content sitting underneath at the edges.
        "pointer-events-none",
      ].join(" ")}
    >
      {/* Unfilled track — a thin vertical line spanning the viewport.
          Renders behind the filled track and the highlight segment so
          unvisited progress reads as a faint reference line. */}
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-foreground/10"
        style={{ width: `${TRACK_WIDTH_PX}px` }}
      />

      {/* Filled track — `scaleY` is bound to the live page scroll
          progress. `transformOrigin: top` so the fill grows from the
          top edge as the page scrolls down. `opacity` ramps from 0 to
          1 over the very first tick so the track isn't visible at
          rest on a non-scrolling page. The fill paints in the active
          accent (`--ring-accent`) so it tracks the live palette;
          falls back to `currentColor` when the palette provider has
          not yet written CSS vars (e.g. very first paint on a fresh
          load). */}
      <motion.div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 h-full origin-top rounded-full bg-[var(--ring-accent,currentColor)]"
        style={{
          width: `${TRACK_WIDTH_PX}px`,
          scaleY: fillScaleY,
          opacity,
        }}
      />

      {/* Highlight segment — sits on top of the filled track and
          tracks the active section's bounding rect. Width thickens
          from 2 px to 5 px so the active state is communicated by
          shape as well as color (Requirement 17.7). Under reduced
          motion the spring is replaced with `duration: 0` so the
          segment snaps to position (Requirement 9.5). */}
      {rect ? (
        <motion.div
          aria-hidden="true"
          className="absolute left-1/2 rounded-full bg-[var(--accent-hex,currentColor)] shadow-[0_0_8px_var(--ring-accent,transparent)]"
          initial={false}
          animate={{
            top: rect.top,
            height: rect.height,
            width: ACTIVE_SEGMENT_WIDTH_PX,
            x: "-50%",
          }}
          transition={
            reduced
              ? { duration: 0 }
              : { ...SEGMENT_SPRING, restDelta: 0.5 }
          }
        />
      ) : null}
    </aside>
  );
}
