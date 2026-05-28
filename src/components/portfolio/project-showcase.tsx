"use client";

/**
 * ProjectShowcase — destination surface of the `Project_Card → Project_Showcase`
 * container transform (task 7.4, Requirements 5.1–5.7, 19.4, 19.6).
 *
 * Container-transform contract:
 *   - The side-panel `<aside>` carries `layoutId={`card-${id}`}`, paired
 *     with the originating `ProjectCard`'s `<MotionArticle layoutId={…}>`.
 *     The cover artwork tile carries `layoutId={`cover-${id}`}`, paired
 *     with the card's `<MotionCover layoutId={…}>`. `motion` runs the
 *     position/size morph on mount and the reverse morph on unmount.
 *   - `transition` on both layout-id elements uses
 *     `motionVariants.containerTransform.animate.transition` (the shared
 *     spring scaled to the 600 ms budget) under normal flow, and
 *     `{ duration: 0 }` under any of: reduced motion, the abort/snap
 *     timer firing, or close-before-settle (Requirement 5.2 / 5.6).
 *
 * Abort-and-snap timer (Requirement 5.2, design.md §C.5):
 *   `BUDGET_MS + ONE_FRAME = 616ms` — if `motion` has not reported
 *   `onLayoutAnimationComplete` by the deadline, `setOpenInstant(true)`
 *   flips the layout transition to `{ duration: 0 }`, which snaps the
 *   surface to its open visual state. The settle ref is also forced to
 *   `true` along this path so the focus trap and close logic still
 *   release.
 *
 * Close behavior (Requirement 5.3):
 *   - If the open transform settled (`hasSettled.current === true`), the
 *     reverse morph runs naturally as `<AnimatePresence>` removes the
 *     showcase.
 *   - If it never settled (rapid second dismissal, abort path, or
 *     reduced motion), `closeInstant` is flipped to `true` and `onClose`
 *     is deferred via `queueMicrotask` so the showcase's last commit
 *     captures `transition={{ duration: 0 }}` before exit. The result is
 *     an instant unmount with no reverse morph.
 *
 * Focus management (Requirement 5.7, 19.6):
 *   - `useFocusTrap(dialogRef, …)` engages once the open transform
 *     settles (or immediately under reduced motion), parking initial
 *     focus on `[data-showcase-close]`. Tab / Shift+Tab cycles within
 *     the dialog; Escape routes through `handleClose`.
 *   - On unmount, the trap restores focus to its captured `prevActive`,
 *     and a separate `useEffect` cleanup also reads the originating
 *     card from the ref pool and re-focuses it. Both paths target the
 *     same `<button>` so the double-focus is harmless and idempotent.
 */

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ArrowUpRight, X } from "lucide-react";
import { TextMorph } from "torph/react";

import {
  m,
  motionDurations,
  motionVariants,
  SHARED_SPRING,
  useReducedMotionState,
} from "@/lib/motion-engine";
import { useFocusTrap } from "@/lib/use-focus-trap";

import type { projects, techById as TechByIdType } from "@/lib/portfolio-data";
import { GitHubIcon } from "./brand-icons";
import { TechIcon } from "./tech-icon";
import { ProjectHeroTile } from "./project-hero-tiles";
import { IPhoneFrame } from "@/components/ui/iphone-frame";
import { phoneScreensByProject } from "./phone-screens";
import { LumenProvider } from "./phone-screens/lumen-screens";

type Project = (typeof projects)[number];

interface ProjectShowcaseProps {
  project: Project;
  techById: typeof TechByIdType;
  onClose: () => void;
  /**
   * Ref pool from `ProjectsSection`, keyed by project id. Read on
   * unmount so focus can return to the originating `ProjectCard`
   * button (Requirement 5.7 / 19.6).
   */
  cardRefMap?: RefObject<Map<string, HTMLElement>>;
  /**
   * `true` while the container-transform from card → surface (or back)
   * is in progress. Drives the activation gate in `ProjectsSection`
   * (Requirement 5.5).
   */
  isAnimating?: boolean;
  /**
   * Invoked when the layout transition settles (or the abort/snap path
   * forces a settle), releasing the parent's activation gate.
   */
  onTransformSettle?: () => void;
}

// 600 ms budget + 1 frame = 616 ms hard ceiling (Requirement 5.2,
// design.md §C.5). After this point the surface snaps to its open
// state regardless of `motion`'s layout animation status.
const ABORT_DEADLINE_MS = motionDurations.containerTransformAbort;

// Shared spring transition shape used by the layout-id morph and the
// phone slide-in. Mirrors `motionVariants.containerTransform.animate
// .transition` so the surface, the cover tile, and the phone all settle
// on the same beat. We construct it locally because `motionVariants`'
// `Variants` typing does not expose `.transition` to TS consumers.
const CONTAINER_TRANSFORM_TRANSITION = {
  ...SHARED_SPRING,
  duration: motionDurations.containerTransform / 1000,
} as const;

const INSTANT_TRANSITION = { duration: 0 } as const;

// Mobile bottom-sheet (Requirement 15.2). Below 768 px the showcase
// substitutes the layout-shared container transform for a vertical
// slide-up sheet. A pointerup with `dy >= 80` (or motion's drag
// `info.offset.y >= 80`) dismisses the sheet; smaller drags spring
// back via motion's default elastic snap.
const MOBILE_VIEWPORT_QUERY = "(max-width: 767px)";
const SWIPE_DISMISS_THRESHOLD_PX = 80;

const MotionSurface = m("aside");
const MotionCover = m("div");

export function ProjectShowcase({
  project,
  techById,
  onClose,
  cardRefMap,
  onTransformSettle,
}: ProjectShowcaseProps) {
  const reduced = useReducedMotionState();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Container-transform lifecycle:
  //   - hasSettled (ref): so the abort timer can read the current value
  //     without forcing a re-render.
  //   - settled (state): mirror that drives the focus trap activation.
  //   - openInstant: set true if the abort timer fires before settle —
  //     flips the layout transition to duration:0 and snaps to open.
  //   - closeInstant: set true on a close-before-settle so the exit's
  //     last-render `transition` is `{ duration: 0 }` and the showcase
  //     unmounts without running the reverse morph.
  const hasSettled = useRef(false);
  const [settled, setSettled] = useState(false);
  const [openInstant, setOpenInstant] = useState(false);
  const [closeInstant, setCloseInstant] = useState(false);

  // Mobile bottom-sheet gate (Requirement 15.2). Defaults to `false`
  // so SSR + first client render match; the effect below flips it to
  // the live `matchMedia` value on mount and listens for changes (eg
  // the user rotating a phone or resizing a desktop window across the
  // 768 px breakpoint mid-session). The sheet path replaces the
  // layout-shared container transform with a vertical slide-up.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    setIsMobile(mql.matches);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handleChange);
      return () => mql.removeEventListener("change", handleChange);
    }
    type LegacyMql = MediaQueryList & {
      addListener?: (
        listener: (event: MediaQueryListEvent) => void,
      ) => void;
      removeListener?: (
        listener: (event: MediaQueryListEvent) => void,
      ) => void;
    };
    (mql as LegacyMql).addListener?.(handleChange);
    return () => {
      (mql as LegacyMql).removeListener?.(handleChange);
    };
  }, []);

  const entry = phoneScreensByProject[project.id];
  const screens = entry?.screens ?? [];
  const autoAdvanceEnabled = entry?.autoAdvance.enabled ?? true;
  const autoAdvanceInterval = entry?.autoAdvance.intervalMs ?? 4500;
  const [screenIndex, setScreenIndex] = useState(0);

  // Phone width — fits the viewport while preserving the iPhone 17 Pro Max
  // aspect (78mm/163.4mm = 0.4774).
  const [phoneWidth, setPhoneWidth] = useState(360);
  useEffect(() => {
    const PHONE_ASPECT = 78 / 163.4;
    const compute = () => {
      const isDesktop = window.innerWidth >= 1024;
      const heightBudget = window.innerHeight * (isDesktop ? 0.86 : 0.78);
      const widthFromHeight = heightBudget * PHONE_ASPECT;
      const widthBudget = isDesktop
        ? window.innerWidth * 0.34
        : window.innerWidth * 0.78;
      const next = Math.min(widthFromHeight, widthBudget, 480);
      setPhoneWidth(Math.max(280, Math.floor(next)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // Body scroll lock
  useEffect(() => {
    const original = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = original;
    };
  }, []);

  // Reduced-motion settle (Requirement 5.6). With reduced motion,
  // there is no layout animation to wait for and `m()` strips
  // `onLayoutAnimationComplete` anyway — so settle synchronously on
  // mount so the focus trap can activate and the parent's activation
  // gate releases without waiting for the abort timer.
  useEffect(() => {
    if (!reduced) return;
    hasSettled.current = true;
    setSettled(true);
    onTransformSettle?.();
  }, [reduced, onTransformSettle]);

  // Abort-and-snap timer (Requirement 5.2). If `motion` has not fired
  // `onLayoutAnimationComplete` by the 616 ms deadline, snap to the
  // open state and force-release settle so the dialog stays usable.
  useEffect(() => {
    if (reduced) return; // open is already instant under reduced motion
    const id = window.setTimeout(() => {
      if (hasSettled.current) return;
      setOpenInstant(true);
      hasSettled.current = true;
      setSettled(true);
      onTransformSettle?.();
    }, ABORT_DEADLINE_MS);
    return () => window.clearTimeout(id);
  }, [reduced, onTransformSettle]);

  // Close handler. If the open transform never settled (or reduced
  // motion is on), substitute an instant unmount: flip `closeInstant`
  // so the surface's last-rendered `transition` is `{ duration: 0 }`
  // and AnimatePresence captures an instant exit. Defer the actual
  // `onClose` via `queueMicrotask` so the closeInstant render commits
  // before the parent removes the showcase.
  const handleClose = useCallback(() => {
    if (reduced || !hasSettled.current) {
      setCloseInstant(true);
      queueMicrotask(() => onClose());
      return;
    }
    onClose();
  }, [reduced, onClose]);

  // Bottom-sheet drag dismiss (Requirement 15.2). On `dragEnd` motion
  // reports the cumulative drag offset in `info.offset.y`. A downward
  // drag of at least 80 px commits the dismissal — we route through
  // `handleClose` so close-before-settle still takes the instant-close
  // path. Smaller drags fall through to motion's `dragSnapToOrigin`
  // spring, which returns the sheet to `y: 0`.
  const handleSheetDragEnd = useCallback(
    (
      _event: MouseEvent | TouchEvent | PointerEvent,
      info: PanInfo,
    ) => {
      if (info.offset.y >= SWIPE_DISMISS_THRESHOLD_PX) {
        handleClose();
      }
    },
    [handleClose],
  );

  // ESC routes through handleClose so close-before-settle takes the
  // instant-close path. The focus trap below also calls handleClose
  // on Escape — both paths are idempotent.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key === "ArrowRight" && screens.length > 0)
        setScreenIndex((i) => (i + 1) % screens.length);
      if (e.key === "ArrowLeft" && screens.length > 0)
        setScreenIndex((i) => (i - 1 + screens.length) % screens.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose, screens.length]);

  // Auto-advance carousel
  useEffect(() => {
    if (!autoAdvanceEnabled) return;
    if (screens.length < 2) return;
    const id = window.setInterval(() => {
      setScreenIndex((i) => (i + 1) % screens.length);
    }, autoAdvanceInterval);
    return () => window.clearInterval(id);
  }, [autoAdvanceEnabled, autoAdvanceInterval, screens.length]);

  // Focus trap (Requirement 5.7, 19.6). Active once the open transform
  // settles (or immediately under reduced motion). The
  // `initialFocusSelector` parks focus on the close button on
  // activation, satisfying "focus moves to the close button after
  // settle." On deactivate / unmount, `useFocusTrap` restores focus
  // to its captured `prevActive` (the originating card).
  useFocusTrap(dialogRef, {
    active: settled,
    initialFocusSelector: "[data-showcase-close]",
    onEscape: handleClose,
  });

  // Belt-and-braces focus restoration via the explicit ref pool
  // (design.md §C.5). Runs on unmount; redundant with the focus
  // trap's `prevActive` restore but pinned by the design contract.
  useEffect(() => {
    return () => {
      if (typeof document === "undefined") return;
      const cardEl = cardRefMap?.current.get(project.id);
      if (cardEl && document.contains(cardEl)) {
        try {
          cardEl.focus();
        } catch {
          /* swallow — detached elements may throw on focus */
        }
      }
    };
  }, [cardRefMap, project.id]);

  // `motion` callback — fires when the layout transition settles
  // (Requirement 5.2). Releases the parent's activation gate via
  // `onTransformSettle`. Stripped under reduced motion by `m()` so the
  // synchronous reduced-motion settle effect above covers that path.
  const handleLayoutAnimationComplete = useCallback(() => {
    if (hasSettled.current) return;
    hasSettled.current = true;
    setSettled(true);
    onTransformSettle?.();
  }, [onTransformSettle]);

  // Mobile bottom-sheet settle (Requirement 15.2). The mobile path
  // has no shared `layoutId` morph and so motion never fires
  // `onLayoutAnimationComplete`. Instead we settle when the
  // `y: 100% → 0%` slide finishes, releasing the focus trap and the
  // parent's activation gate at the moment the sheet docks. Under
  // reduced motion `m()` strips this prop and the synchronous settle
  // effect above covers the path.
  const handleMobileSheetAnimComplete = useCallback(() => {
    if (hasSettled.current) return;
    hasSettled.current = true;
    setSettled(true);
    onTransformSettle?.();
  }, [onTransformSettle]);

  // Layout transition (Requirement 5.2). Spring under normal flow;
  // instant when the abort timer snapped open, when reduced motion is
  // on, or when close-before-settle forces an instant unmount.
  const layoutTransition =
    reduced || openInstant || closeInstant
      ? INSTANT_TRANSITION
      : CONTAINER_TRANSFORM_TRANSITION;

  const ActiveScreen = screens[screenIndex]?.Component ?? null;
  const isLumen = project.id === "lumen";

  // Project index, padded — used as an editorial-style number badge.
  const projectIndex =
    project.id === "chime" ? "01" : project.id === "lumen" ? "02" : "—";
  // Short platform label inferred from the stack.
  const platformLabel = project.stack.includes("jetpack-compose")
    ? "Android · Native"
    : project.stack.includes("react")
    ? "Web"
    : "Mobile";

  // The active-screen carousel sits inside `<AnimatePresence mode="wait">`,
  // which unmounts the previous screen on every transition. For Lumen the
  // state machine (input value, submitted prompt, phase) must survive
  // those transitions, so `LumenProvider` is mounted *outside*
  // `AnimatePresence` and the active screen reads via `useLumen()`.
  const screenContent = ActiveScreen ? (
    <AnimatePresence mode="wait">
      <motion.div
        key={screens[screenIndex]?.id}
        initial={reduced ? false : { opacity: 0 }}
        animate={reduced ? undefined : { opacity: 1 }}
        exit={reduced ? undefined : { opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="h-full w-full"
      >
        <ActiveScreen />
      </motion.div>
    </AnimatePresence>
  ) : (
    <div className="grid h-full place-items-center bg-white">
      <Image
        src={project.image}
        alt={project.title}
        width={300}
        height={620}
        className="h-full w-full object-cover"
      />
    </div>
  );

  const wrappedScreenContent = isLumen ? (
    <LumenProvider screenIndex={screenIndex} setScreenIndex={setScreenIndex}>
      {screenContent}
    </LumenProvider>
  ) : (
    screenContent
  );

  // ── Cover artwork (shared between desktop transform + mobile sheet) ──
  // Spec row + hero tile rendered inside whichever wrapper the surface
  // chooses. Desktop wraps this in `<MotionCover layoutId>` so it pairs
  // with the originating card; mobile renders a plain `<div>` since the
  // sheet does not run the layout-shared transform (Requirement 15.2).
  const coverInner = (
    <>
      {/* Spec row — floats in the top-left of the hero tile */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-4">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-[11px] font-medium tracking-[0.16em] text-neutral-400 dark:text-neutral-500">
            {projectIndex}
          </span>
          <span className="h-px w-6 bg-neutral-300 dark:bg-neutral-700" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
            {platformLabel}
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500 status-dot" />
          live
        </span>
      </div>

      {/* The actual animation */}
      <ProjectHeroTile projectId={project.id} />
    </>
  );

  const coverClassName =
    "relative h-[260px] w-full overflow-hidden rounded-3xl bg-neutral-50 dark:bg-neutral-800/60";

  const cover = isMobile ? (
    <div className={coverClassName}>{coverInner}</div>
  ) : (
    <MotionCover
      layoutId={`cover-${project.id}`}
      transition={layoutTransition}
      className={coverClassName}
    >
      {coverInner}
    </MotionCover>
  );

  // Body content of the panel — identical between desktop and mobile.
  const bodyContent = (
    <div className="flex grow flex-col gap-4 p-5">
      <div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.26em] text-neutral-500 dark:text-neutral-400">
          {project.subtitle}
        </p>
        <h2 className="mt-1.5 font-sans text-[1.85rem] font-bold leading-[1.05] tracking-[-0.02em] text-neutral-900 line-clamp-1 lg:text-[2rem] dark:text-neutral-50">
          <TextMorph
            as="span"
            duration={0.55}
            ease={{ stiffness: 220, damping: 26 }}
          >
            {project.title}
          </TextMorph>
        </h2>
      </div>

      {/* Description — uses the Card spec's gray-500 muted style */}
      <p className="font-sans text-[13px] leading-[1.6] text-gray-500 line-clamp-3 lg:text-[13.5px] dark:text-neutral-400">
        {project.description}
      </p>

      {/* Stack — chips with logos */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-400 dark:text-neutral-500">
          Built with
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {project.stack.map((id, i) => {
            const tech = techById.get(id);
            return (
              <motion.li
                key={id}
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={reduced ? undefined : { opacity: 1, y: 0 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : {
                        delay: 0.4 + i * 0.04,
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1],
                      }
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-neutral-50 px-2.5 py-1 font-sans text-[11.5px] font-medium text-neutral-800 transition-colors duration-200 hover:bg-white dark:bg-neutral-800/80 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                <span className="inline-flex size-3.5 items-center justify-center [&_img]:!size-3.5 [&_svg]:!size-3.5">
                  <TechIcon id={id} size="sm" showLabel={false} />
                </span>
                {tech?.name ?? id}
              </motion.li>
            );
          })}
        </ul>
      </div>

      {/* Screens — segmented control + live readout */}
      {screens.length > 1 ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-400 dark:text-neutral-500">
              Screens
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
              Now showing{" "}
              <TextMorph
                as="span"
                duration={0.45}
                ease={{ stiffness: 260, damping: 28 }}
                className="text-neutral-900 dark:text-neutral-100"
              >
                {screens[screenIndex]?.label ?? ""}
              </TextMorph>
            </p>
          </div>
          <div className="relative mt-2 inline-flex rounded-full border border-border bg-neutral-50 p-0.5 dark:bg-neutral-800/80">
            {screens.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScreenIndex(i)}
                aria-label={`Show ${s.label}`}
                aria-current={i === screenIndex}
                className="relative inline-flex items-center justify-center px-3 py-1.5 font-sans text-[11.5px] font-medium transition-colors duration-200"
              >
                {i === screenIndex ? (
                  <motion.span
                    layoutId={`segmented-${project.id}`}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : {
                            type: "spring",
                            stiffness: 400,
                            damping: 36,
                          }
                    }
                    className="absolute inset-0 rounded-full bg-white shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_4px_14px_-6px_rgba(15,15,40,0.18)] dark:bg-neutral-700 dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_4px_14px_-6px_rgba(0,0,0,0.5)]"
                  />
                ) : null}
                <span
                  className={`relative z-10 ${
                    i === screenIndex
                      ? "text-neutral-900 dark:text-neutral-50"
                      : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* CTAs sit at the bottom of the body */}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {project.links.site ? (
          <a
            href={project.links.site}
            target="_blank"
            rel="noreferrer"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-neutral-900 px-4 py-2 font-sans text-[12.5px] font-medium text-white transition-transform duration-300 ease-out hover:-translate-y-0.5 dark:bg-white dark:text-neutral-900"
          >
            <span className="relative z-10">Visit live site</span>
            <ArrowUpRight className="relative z-10 size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full dark:via-black/20"
            />
          </a>
        ) : null}
        {project.links.github ? (
          <a
            href={project.links.github}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-neutral-50 px-4 py-2 font-sans text-[12.5px] font-medium text-neutral-800 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white dark:bg-neutral-800/80 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <GitHubIcon className="size-3.5" />
            View source
            <ArrowUpRight className="size-3 opacity-50 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
          </a>
        ) : null}
      </div>
    </div>
  );

  // The shared rounded-card chrome that wraps cover + body. Both desktop
  // (layout-shared morph) and mobile (bottom-sheet drag) render this
  // identical inner card; only the surface wrapper differs.
  const panelInnerContent = (
    <div className="flex h-full w-full flex-col rounded-3xl border border-border bg-neutral-100 shadow-[0_30px_80px_-30px_rgba(20,20,40,0.18)] dark:bg-neutral-900 dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]">
      {cover}
      {bodyContent}
    </div>
  );

  if (typeof document === "undefined") return null;

  const overlay = (
    <motion.div
      ref={dialogRef}
      key="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} preview`}
      initial={reduced ? false : { opacity: 0 }}
      animate={reduced ? undefined : { opacity: 1 }}
      exit={reduced ? undefined : { opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[120] bg-white/60 text-foreground backdrop-blur-2xl backdrop-saturate-150 dark:bg-black/60 dark:text-white"
      onClick={handleClose}
    >
      {/* Aurora — soft coloured glows that suggest depth without dominating. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-[10%] top-[8%] h-[60vmin] w-[60vmin] rounded-full bg-[radial-gradient(circle,rgba(168,162,255,0.22),transparent_60%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(99,102,241,0.18),transparent_60%)]" />
        <div className="absolute -right-[8%] top-[40%] h-[55vmin] w-[55vmin] rounded-full bg-[radial-gradient(circle,rgba(255,196,168,0.22),transparent_60%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(244,114,182,0.14),transparent_60%)]" />
        <div className="absolute left-[35%] -bottom-[12%] h-[50vmin] w-[50vmin] rounded-full bg-[radial-gradient(circle,rgba(168,224,255,0.22),transparent_60%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(56,189,248,0.10),transparent_60%)]" />
      </div>

      {/* Stage */}
      <div
        className="relative z-10 flex h-dvh w-full flex-col items-center justify-center gap-10 px-6 py-10 lg:flex-row lg:gap-16 lg:px-16"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Phone */}
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.86, y: 24 }}
          animate={reduced ? undefined : { opacity: 1, scale: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, scale: 0.92, y: 16 }}
          transition={
            reduced ? INSTANT_TRANSITION : CONTAINER_TRANSFORM_TRANSITION
          }
          className="relative flex shrink-0 items-center justify-center [filter:drop-shadow(0_30px_60px_rgba(0,0,0,0.18))_drop-shadow(0_8px_20px_rgba(0,0,0,0.12))] dark:[filter:drop-shadow(0_50px_80px_rgba(0,0,0,0.55))_drop-shadow(0_12px_30px_rgba(0,0,0,0.35))]"
        >
          <IPhoneFrame
            width={phoneWidth}
            className="select-none"
            finish="black"
            screenBackground={screens[screenIndex]?.screenBackground}
            screenColorScheme={screens[screenIndex]?.screenColorScheme ?? "light"}
          >
            {wrappedScreenContent}
          </IPhoneFrame>
        </motion.div>

        {/* ── Side panel — surface root of the Container_Transform ─────
            Desktop (≥768 px): renders as a `<MotionSurface layoutId>`
            paired with the originating `<MotionArticle layoutId>` in
            `ProjectCard`, so motion runs the FLIP morph on mount and
            the reverse morph on unmount (Requirement 5.2).

            Mobile (<768 px, Requirement 15.2): renders as a
            `motion.aside` that slides up from the bottom (`y: 100% →
            0%`) using the shared spring. `drag="y"` with
            `dragConstraints={{ top: 0 }}` lets the user pull the sheet
            downward but never above the docked rest position; on
            release a `dy >= 80` commits dismissal via `handleClose`,
            anything less elastically springs back. The mobile path
            does not pair a `layoutId`, so the cover artwork above
            renders as a plain `<div>` instead of a `<MotionCover>`.
            Focus trap and focus restore are unchanged because both
            run off the dialog's `dialogRef`. */}
        {isMobile ? (
          <motion.aside
            variants={reduced ? undefined : motionVariants.bottomSheet}
            initial={reduced ? false : "initial"}
            animate={reduced ? undefined : "animate"}
            exit={
              reduced || closeInstant
                ? { y: "100%", transition: INSTANT_TRANSITION }
                : "exit"
            }
            drag={reduced ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            dragSnapToOrigin
            onDragEnd={handleSheetDragEnd}
            onAnimationComplete={
              reduced ? undefined : handleMobileSheetAnimComplete
            }
            className="flex w-full max-w-md flex-col self-end lg:max-w-[28rem]"
          >
            {panelInnerContent}
          </motion.aside>
        ) : (
          <MotionSurface
            layoutId={`card-${project.id}`}
            transition={layoutTransition}
            onLayoutAnimationComplete={handleLayoutAnimationComplete}
            className="flex w-full max-w-md flex-col lg:max-w-[28rem]"
          >
            {panelInnerContent}
          </MotionSurface>
        )}
      </div>

      {/* Top-left badge */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: -8 }}
        animate={reduced ? undefined : { opacity: 1, y: 0 }}
        transition={{ delay: reduced ? 0 : 0.32, duration: reduced ? 0 : 0.4 }}
        className="pointer-events-none absolute left-6 top-6 z-20 hidden items-center gap-2.5 lg:flex"
      >
        <span className="size-1.5 rounded-full bg-neutral-900 status-dot dark:bg-white" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
          live preview
        </span>
      </motion.div>

      {/* Close button — initial focus target after settle (Requirement 5.7). */}
      <motion.button
        data-showcase-close=""
        initial={reduced ? false : { opacity: 0, scale: 0.8 }}
        animate={reduced ? undefined : { opacity: 1, scale: 1 }}
        transition={{ delay: reduced ? 0 : 0.4, duration: reduced ? 0 : 0.3 }}
        type="button"
        onClick={handleClose}
        aria-label="Close project preview"
        className="group absolute right-5 top-5 z-20 inline-flex size-11 items-center justify-center rounded-full border border-border bg-neutral-50 text-neutral-700 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white hover:text-neutral-900 dark:bg-neutral-900/80 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
      >
        <X className="size-5 transition-transform duration-200 group-hover:rotate-90" />
      </motion.button>

      {/* Bottom hint */}
      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={reduced ? undefined : { opacity: 1 }}
        transition={{ delay: reduced ? 0 : 0.6, duration: reduced ? 0 : 0.5 }}
        className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
          esc to close · ← → switch screens
        </span>
      </motion.div>
    </motion.div>
  );

  return createPortal(overlay, document.body);
}
