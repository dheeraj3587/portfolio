"use client";

/**
 * Device_Showcase — scroll-driven stage that pins a `PhoneFrame` between the
 * hero and the projects grid and scrubs through real Chime + Lumen screens
 * as the user scrolls (Requirements 3.1, 3.2).
 *
 * This file lands the ≥768 px scroll-driven path *and* the <768 px native
 * scroll-snap carousel fallback (Requirements 3.7, 15.3). The two paths are
 * mounted side by side and gated by Tailwind's `md:` breakpoint
 * (`hidden md:block` / `md:hidden`), which matches the 768 px threshold the
 * spec calls out. Doing the swap in CSS instead of with a JS `matchMedia`
 * branch avoids a one-frame layout flash during hydration and keeps the
 * SSR'd HTML stable across both viewport classes.
 *
 * Task 9.3 layers a third path on top of the two:
 *
 *   - Reduced-motion + slow-connection static fallback (Requirements 3.8,
 *     16.6). When `useReducedMotionState()` is `true` or the user's
 *     `effectiveType` is `"2g"` / `"slow-2g"`, the showcase renders one
 *     static `PhoneFrame` per project side by side, each with on-frame
 *     pagination dots driven by plain React state. No `useScroll` runs in
 *     this branch — the scroll-pin path is a sibling sub-component
 *     (`ScrollPinStage`) so the static path does not even instantiate
 *     `useScroll`. This is what lets Property 14 prove that no scroll
 *     subscription is established under `2g`/`slow-2g`.
 *
 * Task 9.4 extends this with IntersectionObserver-gated lazy load of screen
 * artwork beyond the first screen per project.
 *
 * Geometry note ("fixed-aspect outer wrapper sized to the larger of …"):
 * Android frames have aspect 0.45 (taller per unit width) and iOS frames
 * have aspect 0.477 (slightly wider). Because a smaller `width / height`
 * ratio means a *taller* box at a given width, the envelope that
 * accommodates both is `Math.min(0.45, 0.477) = 0.45`. The outer wrapper
 * therefore uses `aspectRatio: ANDROID_FRAME_ASPECT_RATIO` (= 0.45) — the
 * variant that demands more vertical space — so at any chosen wrapper
 * width *either* frame fits inside without overflowing. The narrower iOS
 * frame leaves a small symmetric gap above and below, but the wrapper's
 * own dimensions never change between flips. That is what keeps
 * `Device_Showcase` from shifting the page layout when the variant
 * cross-fade plays (Requirement 3.5 / 12.5, design §16.2).
 */

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";

import { selectDeviceVariant, type DeviceVariant } from "@/lib/device-variant";
import {
  motionVariants,
  useEffectiveConnectionType,
  useReducedMotionState,
} from "@/lib/motion-engine";
import { projects } from "@/lib/portfolio-data";
import { PhoneFrame } from "@/components/ui/phone-frame";
import { ANDROID_FRAME_ASPECT_RATIO } from "@/components/ui/android-phone-frame.helpers";

export interface DeviceShowcaseProps {
  /**
   * Invoked when the user clicks/taps (or activates via keyboard) the
   * pinned `PhoneFrame`. The value is the project id of whichever screen
   * is currently active. Task 15.3 wires this up to
   * `ProjectsSection.setActiveId` so the showcase opens the right project
   * (Requirement 3.6). Optional so the component is safe to mount in
   * isolation (e.g. Storybook, tests).
   */
  onOpenProject?: (projectId: string) => void;
}

interface ShowcaseRecord {
  projectId: string;
  projectTitle: string;
  deviceVariant: DeviceVariant;
  screenId: string;
  kicker: string;
  imageSrc: string;
  alt: string;
  /**
   * Whether this is the first screen for its project. First-screen
   * artwork is `priority`-loaded so the section never shows an empty
   * frame on mount (Requirement 3.9 — lazy-loading of subsequent
   * screens lands in task 9.4).
   */
  isProjectLead: boolean;
  /** Forces the device's status-bar tint resolver. Mirrors the values in
   *  `phone-screens/index.tsx` so chime reads as a dark surface and lumen
   *  as a light one. */
  screenColorScheme: "light" | "dark";
}

/** Per-project surface metadata used to render the screen behind the image
 *  (visible while the artwork loads or on the brief frame between
 *  screen-id transitions). Mirrors `phone-screens/index.tsx`. */
const PROJECT_SCREEN_THEME: Record<
  string,
  { background: string; colorScheme: "light" | "dark" }
> = {
  chime: { background: "#1a100b", colorScheme: "dark" },
  lumen: { background: "#f8f6f2", colorScheme: "light" },
};

/**
 * Build the flat record list once at module-eval time. Order follows the
 * `projects` array (chime first, then lumen), and within a project follows
 * the order of `showcaseKickers` declared in `portfolio-data.ts`.
 */
const SCREEN_RECORDS: readonly ShowcaseRecord[] = projects.flatMap((project) => {
  const kickers = project.showcaseKickers;
  if (!kickers || kickers.length === 0) return [];
  const variant = selectDeviceVariant(project);
  const theme = PROJECT_SCREEN_THEME[project.id] ?? {
    background: "#ffffff",
    colorScheme: "light" as const,
  };
  return kickers.map((entry, index) => ({
    projectId: project.id,
    projectTitle: project.title,
    deviceVariant: variant,
    screenId: entry.screenId,
    kicker: entry.kicker,
    imageSrc: `/images/projects/${project.id}/${entry.screenId}.webp`,
    alt: `${project.title} — ${entry.kicker}`,
    isProjectLead: index === 0,
    screenColorScheme: theme.colorScheme,
  }));
});

const TOTAL_SCREENS = SCREEN_RECORDS.length;

/**
 * Records grouped by project, preserving the project order from
 * `portfolio-data.ts` and the screen order from each project's
 * `showcaseKickers`. The static-fallback path renders one frame per group;
 * within a group the first record is `isProjectLead === true` and is what
 * the static frame defaults to before the user paginates.
 */
const PROJECT_SCREEN_GROUPS: ReadonlyArray<{
  projectId: string;
  projectTitle: string;
  records: readonly ShowcaseRecord[];
}> = (() => {
  const order: string[] = [];
  const map = new Map<string, ShowcaseRecord[]>();
  for (const record of SCREEN_RECORDS) {
    const existing = map.get(record.projectId);
    if (existing) {
      existing.push(record);
    } else {
      order.push(record.projectId);
      map.set(record.projectId, [record]);
    }
  }
  return order.map((projectId) => {
    const records = map.get(projectId)!;
    return {
      projectId,
      projectTitle: records[0].projectTitle,
      records,
    };
  });
})();

/**
 * Sticky-pinning math for `useScroll({ offset: ["start end", "end start"] })`:
 *
 *   sectionHeight = 200vh, viewportHeight = 100vh
 *   total scroll covered by progress ∈ [0, 1] = 300vh
 *
 *   - progress 0       → section top at viewport bottom (about to enter)
 *   - progress 1/3     → section top at viewport top (sticky pinning starts)
 *   - progress 2/3     → section top is 100vh above viewport top (sticky
 *                        pinning ends — sticky inner stage is 100vh tall
 *                        inside a 200vh section, so it travels 100vh)
 *   - progress 1       → section bottom at viewport top (just left)
 *
 * Driving screen index across the [1/3, 2/3] range puts screen 0 on the
 * very first pinned frame and the last screen on the very last pinned
 * frame, which is the natural feel.
 */
const PIN_RANGE_START = 1 / 3;
const PIN_RANGE_END = 2 / 3;

/**
 * Aspect ratio used for the outer fixed-aspect wrapper around the variant
 * cross-fade. Equal to {@link ANDROID_FRAME_ASPECT_RATIO} (= 0.45) — the
 * smaller of the two variant ratios (Android 0.45, iOS 78/163.4 ≈ 0.4774).
 * A *smaller* `width / height` ratio means the wrapper is taller per unit
 * width, which is exactly what we need: at any chosen wrapper width, the
 * shorter (iOS) frame still fits inside without overflow, leaving a
 * symmetric vertical gap. The wrapper's own dimensions never change as
 * the variant flips, so the parent never reflows during the ≤600 ms
 * cross-fade (Requirement 12.5, design §16.2). Sharing the constant with
 * `AndroidPhoneFrame` also keeps the two in lock-step if the Android
 * ratio is ever retuned.
 */
const FRAME_WRAPPER_ASPECT = ANDROID_FRAME_ASPECT_RATIO;
/** Default frame width on the desktop (≥768 px) path. The mobile carousel
 *  uses {@link MOBILE_FRAME_WIDTH_PX}. */
const FRAME_WIDTH_PX = 280;
/** Frame width inside each carousel slide on the <768 px path. Smaller than
 *  the desktop frame so two adjacent slides peek into view as the user
 *  swipes, advertising the carousel affordance. */
const MOBILE_FRAME_WIDTH_PX = 240;
/** Frame width used by the static fallback. Slightly smaller than the
 *  desktop scroll-pin so two frames sit comfortably side-by-side at the
 *  768 px breakpoint without crowding the kicker / pagination strip. */
const STATIC_FRAME_WIDTH_PX = 240;

/** Variant cross-fade duration in seconds (≤600 ms — Requirement 3.5). */
const VARIANT_FADE_S = 0.6;

/**
 * Lazy-load gate for showcase artwork (Requirements 3.9, 16.5). Watches the
 * passed-in element with an `IntersectionObserver` configured with
 * `rootMargin: "200vh"` so the gate flips to `true` once the section is
 * within ~2 viewport heights of the user's current scroll position. After
 * the first intersection the observer is disconnected: this is a one-shot
 * latch, not a presence tracker. Components that want to lazy-load images
 * pass the result to `<Image loading={nearViewport ? "eager" : "lazy"} />`,
 * or, for first-screen artwork (the `isProjectLead` case), keep `priority`
 * so the section never shows an empty frame on mount.
 *
 * SSR / no-IO environments (e.g. test renderers without
 * `IntersectionObserver`) get `true` immediately so artwork still renders.
 * The observer is fully isolated from `useScroll` — it does not subscribe
 * to scroll progress, so even when the static-fallback path uses this hook
 * (which it does, to satisfy Requirement 3.9 on slow connections too)
 * Property 14's "no scroll subscription on 2g/slow-2g" guarantee is
 * preserved. `IntersectionObserver` is a separate browser API.
 */
function useNearViewport(
  ref: RefObject<HTMLElement | null>,
  rootMargin: string = "200vh",
): boolean {
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    if (typeof IntersectionObserver === "undefined") {
      // Fallback for environments without IO (older test runners, SSR).
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setNearViewport(true);
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return nearViewport;
}

/**
 * Top-level dispatcher. Selects the static fallback path when the user has
 * `prefers-reduced-motion: reduce` on (Requirement 3.8) or when their
 * `effectiveType` reports a slow connection (Requirement 16.6). On the
 * static path the scroll-pin sub-component is never instantiated, so
 * `useScroll` never subscribes — Property 14 relies on this to prove that
 * the showcase does not bind to scroll progress on `2g` / `slow-2g`.
 */
export function DeviceShowcase({ onOpenProject }: DeviceShowcaseProps = {}) {
  const reducedMotion = useReducedMotionState();
  const effectiveType = useEffectiveConnectionType();
  const useStaticFallback =
    reducedMotion ||
    effectiveType === "2g" ||
    effectiveType === "slow-2g";

  if (TOTAL_SCREENS === 0) return null;

  if (useStaticFallback) {
    return <StaticFallback onOpenProject={onOpenProject} />;
  }
  return <ScrollPinStage onOpenProject={onOpenProject} />;
}

/**
 * The animated path: the 200 vh section with a sticky inner stage on
 * ≥768 px viewports and the native scroll-snap carousel on <768 px.
 * Owning `useScroll` inside this sub-component is what keeps the static
 * fallback path completely free of motion subscriptions.
 */
function ScrollPinStage({ onOpenProject }: DeviceShowcaseProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Lazy-load gate (Requirements 3.9, 16.5). Flips to `true` when the
  // section is within 200vh of the viewport. Images for `isProjectLead`
  // screens stay eager regardless via `priority`; everything else waits on
  // this latch. The observer lives in this scroll-pin sub-component, not
  // in `DeviceShowcase`, so the static fallback path never instantiates
  // it — keeping that path subscription-free.
  const nearViewport = useNearViewport(sectionRef);

  // Map [PIN_RANGE_START, PIN_RANGE_END] → [0, TOTAL_SCREENS]. Combined with
  // `Math.floor` below, each screen occupies an equal slice of the pinned
  // range. The final screen captures the upper boundary because we clamp
  // the floored result to TOTAL_SCREENS - 1.
  const screenProgress = useTransform(
    scrollYProgress,
    [PIN_RANGE_START, PIN_RANGE_END],
    [0, TOTAL_SCREENS],
    { clamp: true },
  );

  const [activeIndex, setActiveIndex] = useState(0);
  useMotionValueEvent(screenProgress, "change", (latest) => {
    const next = Math.min(
      TOTAL_SCREENS - 1,
      Math.max(0, Math.floor(latest)),
    );
    if (next !== activeIndex) setActiveIndex(next);
  });

  const active = SCREEN_RECORDS[activeIndex] ?? SCREEN_RECORDS[0];

  return (
    <section
      ref={sectionRef}
      data-device-showcase
      aria-label="Featured app device showcase"
      className="relative md:min-h-[200vh]"
    >
      {/* ─────────────────────────── Desktop (≥768 px) ──────────────────────
          Scroll-driven pin. Hidden under the `md` breakpoint so the
          200 vh-tall ghost region only exists on viewports that actually
          drive it (Requirement 3.2). */}
      <div className="hidden md:block">
        <div className="sticky top-0 flex h-screen flex-col items-center justify-center gap-8 px-4">
          {/* Fixed-aspect outer wrapper: dimensions never change as the
              variant flips, so the parent never reflows (design §16.2). */}
          <div
            className="relative"
            style={{
              width: FRAME_WIDTH_PX,
              aspectRatio: `${FRAME_WRAPPER_ASPECT}`,
            }}
          >
            <button
              type="button"
              onClick={() => onOpenProject?.(active.projectId)}
              aria-label={`Open ${active.projectTitle} showcase`}
              className="group block h-full w-full cursor-pointer rounded-[12%] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:[outline-color:var(--ring-accent,currentColor)]"
            >
              {/* Variant cross-fade — keyed on projectId so AnimatePresence
                  only re-runs when the active record's project flips. The
                  ≤600 ms easeInOut bound is Requirement 3.5. */}
              <AnimatePresence mode="sync" initial={false}>
                <motion.div
                  key={active.projectId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: VARIANT_FADE_S, ease: "easeInOut" }}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  <PhoneFrameForVariant
                    variant={active.deviceVariant}
                    screenColorScheme={active.screenColorScheme}
                    screenBackground={
                      PROJECT_SCREEN_THEME[active.projectId]?.background
                    }
                    width={FRAME_WIDTH_PX}
                  >
                    {/* Inner shared-axis screen swap (≤500 ms,
                        Requirement 3.4). `mode="wait"` keeps the outgoing
                        screen on screen long enough to play its exit before
                        the incoming screen enters. */}
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={active.screenId}
                        variants={motionVariants.sharedAxis}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="relative h-full w-full"
                      >
                        <Image
                          src={active.imageSrc}
                          alt={active.alt}
                          fill
                          sizes="(max-width: 767px) 80vw, 280px"
                          priority={active.isProjectLead}
                          loading={
                            active.isProjectLead
                              ? undefined
                              : nearViewport
                                ? "eager"
                                : "lazy"
                          }
                          className="object-cover"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </PhoneFrameForVariant>
                </motion.div>
              </AnimatePresence>
            </button>
          </div>

          {/* Per-screen kicker. Reserved height keeps the layout stable as
              kickers swap. `aria-live="polite"` lets assistive tech follow
              the active screen without being interrupted. */}
          <div
            className="h-10 w-full max-w-md text-center"
            aria-live="polite"
            aria-atomic="true"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={active.screenId}
                variants={motionVariants.sharedAxis}
                initial="initial"
                animate="animate"
                exit="exit"
                className="font-mono text-xs uppercase tracking-[0.18em] text-muted-2"
              >
                {active.kicker}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ─────────────────────────── Mobile (<768 px) ───────────────────────
          Native horizontal scroll-snap carousel. Replaces the scroll-pin
          with one-card-per-screen swiping plus pagination dots. Native
          momentum + `scroll-snap-type: x mandatory` on the `<ul>` and
          `scroll-snap-align: center` on each `<li>` cover both touch
          swipe and tap-to-paginate (Requirements 3.7, 15.3). */}
      <MobileCarousel
        onOpenProject={onOpenProject}
        nearViewport={nearViewport}
      />
    </section>
  );
}

/**
 * Mobile carousel fallback for the <768 px branch. Owns its own active
 * index by listening to the `<ul>`'s scroll position rather than driving
 * it from the section's `useScroll`, so the dots reflect what the user
 * is *actually* looking at on a tiny screen.
 *
 * Each slide is a `<button>` so a tap (or keyboard activation) opens the
 * corresponding `Project_Showcase` (Requirement 3.6). Pagination dots
 * call `el.scrollIntoView({ inline: "center", behavior: "smooth" })` on
 * the target `<li>`, which the same scroll-snap logic then locks to.
 */
function MobileCarousel({
  onOpenProject,
  nearViewport,
}: {
  onOpenProject?: (projectId: string) => void;
  /**
   * Lazy-load gate forwarded from the owning `ScrollPinStage`. Non-lead
   * screen images stay `loading="lazy"` until this flips to `true`
   * (Requirements 3.9, 16.5). First-screen artwork (`isProjectLead`)
   * keeps `priority` regardless so each project's lead frame paints on
   * mount.
   */
  nearViewport: boolean;
}) {
  const scrollerRef = useRef<HTMLUListElement | null>(null);
  const slideRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Track the active slide by dividing scrollLeft by the slide width.
  // We round so the dot snaps to the nearest slide *during* the swipe,
  // matching the snap target the browser will land on. Throttled via
  // requestAnimationFrame so a fast flick doesn't queue dozens of
  // re-renders.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let raf = 0;
    const onScroll = () => {
      if (raf !== 0) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const firstSlide = slideRefs.current[0];
        if (!firstSlide) return;
        // `offsetWidth` is the snap-step; `scrollLeft` rounded to the
        // nearest multiple is the active index.
        const step = firstSlide.offsetWidth;
        if (step <= 0) return;
        const next = Math.min(
          TOTAL_SCREENS - 1,
          Math.max(0, Math.round(scroller.scrollLeft / step)),
        );
        setActiveIndex((prev) => (prev === next ? prev : next));
      });
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (raf !== 0) window.cancelAnimationFrame(raf);
    };
  }, []);

  const goToSlide = (index: number) => {
    const target = slideRefs.current[index];
    if (!target) return;
    target.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  return (
    <div className="md:hidden flex flex-col items-center gap-6 py-8">
      <ul
        ref={scrollerRef}
        className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        // Pagination is in the dots; the scroller itself is presentational.
        aria-roledescription="carousel"
        aria-label="Featured app screens"
      >
        {SCREEN_RECORDS.map((record, index) => (
          <li
            key={`${record.projectId}-${record.screenId}`}
            ref={(el) => {
              slideRefs.current[index] = el;
            }}
            className="snap-center shrink-0 w-full flex flex-col items-center gap-4 px-4"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${TOTAL_SCREENS}: ${record.projectTitle}`}
          >
            <button
              type="button"
              onClick={() => onOpenProject?.(record.projectId)}
              aria-label={`Open ${record.projectTitle} showcase`}
              className="block cursor-pointer rounded-[12%] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:[outline-color:var(--ring-accent,currentColor)]"
            >
              <PhoneFrameForVariant
                variant={record.deviceVariant}
                screenColorScheme={record.screenColorScheme}
                screenBackground={
                  PROJECT_SCREEN_THEME[record.projectId]?.background
                }
                width={MOBILE_FRAME_WIDTH_PX}
              >
                <div className="relative h-full w-full">
                  <Image
                    src={record.imageSrc}
                    alt={record.alt}
                    fill
                    sizes="(max-width: 767px) 80vw, 280px"
                    priority={record.isProjectLead}
                    loading={
                      record.isProjectLead
                        ? undefined
                        : nearViewport
                          ? "eager"
                          : "lazy"
                    }
                    className="object-cover"
                  />
                </div>
              </PhoneFrameForVariant>
            </button>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-2 text-center">
              {record.kicker}
            </p>
          </li>
        ))}
      </ul>

      {/* Pagination dots. Each is its own button with a non-empty
          accessible name; the active dot is reflected via `aria-current`
          *and* a thicker filled style so the state isn't communicated
          by colour alone (Req 17.7-style guidance). */}
      <ol
        className="flex items-center justify-center gap-2"
        aria-label="Carousel pagination"
      >
        {SCREEN_RECORDS.map((record, index) => {
          const isActive = index === activeIndex;
          return (
            <li key={`dot-${record.projectId}-${record.screenId}`}>
              <button
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Go to ${record.projectTitle} — ${record.kicker}`}
                aria-current={isActive ? "true" : undefined}
                // 44 × 44 hit target via padding (Req 15.4) with a smaller
                // visual disc inside.
                className="grid place-items-center size-11 cursor-pointer rounded-full focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--ring-accent,currentColor)]"
              >
                <span
                  aria-hidden="true"
                  className={
                    isActive
                      ? "block size-2.5 rounded-full bg-foreground"
                      : "block size-2 rounded-full bg-foreground/30"
                  }
                />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Static fallback (Requirements 3.8, 16.6). Renders one `PhoneFrame` per
 * project side-by-side on ≥768 px and stacked on smaller viewports, each
 * with on-frame pagination dots driven by plain React state. There is no
 * scroll subscription, no shader, and no `motion`-driven layered effect on
 * this path — the only animation surface is `PhoneFrame` itself, which is
 * shared with every other path. Property 14 (`Slow-connection static
 * fallback`) inspects this branch.
 *
 * Pagination semantics:
 *   - Each frame defaults to its project's first screen (the
 *     `isProjectLead === true` record).
 *   - Dots are rendered below the frame (not on the frame) so they remain
 *     reachable on tiny touch viewports without the device chrome
 *     occluding the hit target.
 *   - State is local to this component and keyed by projectId so paginating
 *     one frame never moves another.
 */
function StaticFallback({
  onOpenProject,
}: {
  onOpenProject?: (projectId: string) => void;
}) {
  // One active index per project, defaulting to 0 (the lead screen).
  const initialIndices = useMemo(() => {
    const out: Record<string, number> = {};
    for (const group of PROJECT_SCREEN_GROUPS) out[group.projectId] = 0;
    return out;
  }, []);
  const [activeIndices, setActiveIndices] = useState(initialIndices);

  // Lazy-load gate (Requirements 3.9, 16.5). Same `IntersectionObserver`
  // contract as the scroll-pin path, just observing the static section.
  // Pure DOM API — no scroll subscription — so this remains compatible
  // with Property 14's "no scroll bind on slow connections" guarantee.
  const sectionRef = useRef<HTMLElement | null>(null);
  const nearViewport = useNearViewport(sectionRef);

  return (
    <section
      ref={sectionRef}
      data-device-showcase
      data-static-fallback
      aria-label="Featured app device showcase"
      className="relative flex flex-col items-center justify-center gap-10 px-4 py-12 md:flex-row md:items-start md:gap-12"
    >
      {PROJECT_SCREEN_GROUPS.map((group) => {
        const activeIndex = activeIndices[group.projectId] ?? 0;
        const records = group.records;
        if (records.length === 0) return null;
        const safeIndex = Math.min(
          records.length - 1,
          Math.max(0, activeIndex),
        );
        const active = records[safeIndex];
        const theme = PROJECT_SCREEN_THEME[group.projectId];
        return (
          <div
            key={group.projectId}
            className="flex flex-col items-center gap-4"
          >
            <div
              className="relative"
              style={{
                width: STATIC_FRAME_WIDTH_PX,
                aspectRatio: `${FRAME_WRAPPER_ASPECT}`,
              }}
            >
              <button
                type="button"
                onClick={() => onOpenProject?.(group.projectId)}
                aria-label={`Open ${group.projectTitle} showcase`}
                className="absolute inset-0 flex items-center justify-center cursor-pointer rounded-[12%] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:[outline-color:var(--ring-accent,currentColor)]"
              >
                <PhoneFrameForVariant
                  variant={active.deviceVariant}
                  screenColorScheme={active.screenColorScheme}
                  screenBackground={theme?.background}
                  width={STATIC_FRAME_WIDTH_PX}
                >
                  <div className="relative h-full w-full">
                    <Image
                      src={active.imageSrc}
                      alt={active.alt}
                      fill
                      sizes="(max-width: 767px) 80vw, 240px"
                      priority={active.isProjectLead}
                      loading={
                        active.isProjectLead
                          ? undefined
                          : nearViewport
                            ? "eager"
                            : "lazy"
                      }
                      className="object-cover"
                    />
                  </div>
                </PhoneFrameForVariant>
              </button>
            </div>

            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-2 text-center">
              {active.kicker}
            </p>

            {/* On-frame pagination control (Req 3.8). Rendered as an `<ol>`
                of `<button>`s so the active state is communicated by both
                `aria-current` and a thicker filled disc — colour alone is
                not load-bearing (Req 17.7-style guidance). */}
            <ol
              className="flex items-center justify-center gap-2"
              aria-label={`${group.projectTitle} pagination`}
            >
              {records.map((record, index) => {
                const isActive = index === safeIndex;
                return (
                  <li key={`static-dot-${group.projectId}-${record.screenId}`}>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveIndices((prev) => ({
                          ...prev,
                          [group.projectId]: index,
                        }))
                      }
                      aria-label={`Show ${record.projectTitle} — ${record.kicker}`}
                      aria-current={isActive ? "true" : undefined}
                      className="grid place-items-center size-11 cursor-pointer rounded-full focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--ring-accent,currentColor)]"
                    >
                      <span
                        aria-hidden="true"
                        className={
                          isActive
                            ? "block size-2.5 rounded-full bg-foreground"
                            : "block size-2 rounded-full bg-foreground/30"
                        }
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </section>
  );
}

/**
 * Variant-specific PhoneFrame wrapper. Encoded as a small helper so the
 * `variant` prop is statically narrowed and we forward only the props the
 * destination frame actually accepts (the dispatcher's discriminated
 * union does not auto-coerce optional Android-only / iOS-only props).
 */
function PhoneFrameForVariant({
  variant,
  screenColorScheme,
  screenBackground,
  width,
  children,
}: {
  variant: DeviceVariant;
  screenColorScheme: "light" | "dark";
  screenBackground?: string;
  width: number;
  children: React.ReactNode;
}) {
  if (variant === "android") {
    return (
      <PhoneFrame
        variant="android"
        width={width}
        screenColorScheme={screenColorScheme}
        screenBackground={screenBackground}
      >
        {children}
      </PhoneFrame>
    );
  }
  return (
    <PhoneFrame
      variant="ios"
      width={width}
      screenColorScheme={screenColorScheme}
      screenBackground={screenBackground}
    >
      {children}
    </PhoneFrame>
  );
}
