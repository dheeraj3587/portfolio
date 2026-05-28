"use client";

/**
 * ProjectCard — phone-framed project tile for the `Projects` grid (task 7.2).
 *
 * Surface contract:
 *   - The whole card is a `<button type="button">`. Native buttons fire
 *     `click` for mouse, Enter, and Space, so click + keyboard parity is
 *     automatic — there is no separate keydown handler that risks firing
 *     `onOpen` twice (Requirement 5.1 / 19.3).
 *   - Inside the button: `<motion.article layoutId="card-${id}">` wraps a
 *     `<motion.div layoutId="cover-${id}">` over the cover artwork. Both
 *     layout-id pairings are matched by `ProjectShowcase` in task 7.4 so the
 *     showcase morph docks against the originating card without any
 *     hand-rolled FLIP math.
 *   - Cover artwork renders inside a `<PhoneFrame>` whose variant is picked
 *     by `selectDeviceVariant(project)` so each project's chrome reads as
 *     its real platform (Requirement 4.1, 4.2, 4.4).
 *
 * Motion contract:
 *   - Fine pointer (`event.pointerType === "mouse"`): 3D tilt capped at
 *     ±6° per axis driven by motion values + a spring with settle time well
 *     under 400 ms on `pointerleave` (Requirement 4.5). A radial highlight
 *     overlay tracks the cursor on hover (CSS gates it out under
 *     `(pointer: coarse)`).
 *   - Coarse pointer (`event.pointerType === "touch"`): tilt is suppressed
 *     entirely; presses spawn a Material ripple via `usePressRipple` that
 *     respects `--ripple-accent` and the slow-connection decay table
 *     (Requirement 1.4 / 1.5).
 *   - Reveal-on-viewport uses `motionVariants.staggeredReveal(60)` so each
 *     card lands within the 600 ms `cardReveal` budget (Requirement 4.6).
 *   - Reduced motion: every animated branch is skipped — no tilt, no
 *     highlight, no whileInView reveal, and `m()` strips the layoutId so
 *     the showcase morph degrades to instant on both ends (Requirement
 *     17.2 → 19.4 in task 7.4).
 *
 * Ref-pool contract:
 *   - The button element registers itself with the optional `registerRef`
 *     callback on mount and unregisters on unmount. `ProjectsSection` uses
 *     this `Map<projectId, HTMLElement>` to restore focus to the originating
 *     card when the showcase closes (Requirement 19.6, wired in task 7.4).
 */

import Image from "next/image";
import {
  useCallback,
  useEffect,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { ExternalLink } from "lucide-react";

import {
  m,
  motionVariants,
  useReducedMotionState,
} from "@/lib/motion-engine";
import { selectDeviceVariant } from "@/lib/device-variant";
import { PhoneFrame } from "@/components/ui/phone-frame";
import { usePressRipple } from "@/components/ui/ripple";
import type { Project, TechItem } from "@/lib/portfolio-data";

import { GitHubIcon } from "./brand-icons";
import { TechIcon } from "./tech-icon";

/**
 * 3D tilt cap per axis, in degrees. Requirement 4.5 caps the rotation at
 * 6° on each axis.
 */
const TILT_RANGE_DEG = 6;

/**
 * Spring config for the tilt's return-to-neutral. With these values the
 * critical damping ratio sits just above 1 and the spring settles within
 * ~200 ms — comfortably inside the 400 ms ceiling from Requirement 4.5.
 */
const TILT_SPRING = { stiffness: 220, damping: 22, mass: 0.4 };

/**
 * Width of the embedded `PhoneFrame` inside the card. Picked so two cards
 * fit at `sm:grid-cols-2` (the section's grid) without pinching the body
 * copy underneath.
 */
const PHONE_FRAME_WIDTH = 240;

/**
 * Per-card stagger step in milliseconds. Stays inside the
 * `staggerStepMin/Max` bounds the motion engine table publishes
 * (40 – 160 ms) and lets a 2-card row land well inside the 600 ms
 * `cardReveal` budget.
 */
const REVEAL_STAGGER_STEP_MS = 60;

const MotionArticle = m("article");
const MotionCover = m("div");

export interface ProjectCardProps {
  readonly project: Project;
  /** Invoked once per click / Enter / Space activation. */
  readonly onOpen: (id: string) => void;
  /**
   * Receives the underlying `<button>` element on mount and `null` on
   * unmount so `ProjectsSection` can keep a `Map<projectId, HTMLElement>`
   * for focus restoration after the showcase closes.
   */
  readonly registerRef?: (id: string, el: HTMLElement | null) => void;
  /** Tech-icon registry forwarded from the section. */
  readonly techById: Map<string, TechItem>;
}

export function ProjectCard({
  project,
  onOpen,
  registerRef,
  techById,
}: ProjectCardProps) {
  const reduced = useReducedMotionState();
  const deviceVariant = selectDeviceVariant(project);

  // ── 3D tilt (fine pointer only) ───────────────────────────────────────
  // Two motion values track the cursor's normalised position inside the
  // card, then drive springed rotateX / rotateY plus a radial highlight
  // overlay. Under reduced motion the values stay parked at center and we
  // skip wiring them onto the article's style entirely.
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(
    useTransform(mouseY, [0, 1], [TILT_RANGE_DEG, -TILT_RANGE_DEG]),
    TILT_SPRING,
  );
  const rotateY = useSpring(
    useTransform(mouseX, [0, 1], [-TILT_RANGE_DEG, TILT_RANGE_DEG]),
    TILT_SPRING,
  );
  const highlightX = useTransform(mouseX, (v) => `${v * 100}%`);
  const highlightY = useTransform(mouseY, (v) => `${v * 100}%`);
  const highlight = useMotionTemplate`radial-gradient(220px circle at ${highlightX} ${highlightY}, rgba(99,102,241,0.18), transparent 60%)`;

  // ── Press ripple (coarse pointer alternative to tilt) ─────────────────
  const { bind: rippleBind, ripples: rippleNodes } =
    usePressRipple<HTMLButtonElement>();

  // The ripple hook owns the underlying ref. We register the same DOM node
  // with the parent's `Map<projectId, HTMLElement>` ref pool inside an
  // effect so the lint rule against mutating hook return values stays
  // happy. The effect re-runs only when `registerRef` or `project.id`
  // change, and unregisters with `null` on unmount.
  const rippleRef = rippleBind.ref;
  useEffect(() => {
    const node = rippleRef.current;
    if (!registerRef) return;
    registerRef(project.id, node);
    return () => {
      registerRef(project.id, null);
    };
  }, [rippleRef, project.id, registerRef]);

  const handleClick = useCallback(() => {
    onOpen(project.id);
  }, [onOpen, project.id]);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (reduced) return;
      // Touch-driven `pointermove` events are noisy and would also fight
      // the ripple. Coarse pointers get the ripple, not the tilt.
      if (event.pointerType === "touch") return;
      const rect = event.currentTarget.getBoundingClientRect();
      mouseX.set((event.clientX - rect.left) / rect.width);
      mouseY.set((event.clientY - rect.top) / rect.height);
    },
    [reduced, mouseX, mouseY],
  );

  const resetTilt = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      // Coarse pointer: spawn the ripple. Fine pointer: rely on tilt for
      // press feedback per Requirement 1.4 / 1.5 and the task brief.
      if (event.pointerType === "touch") {
        rippleBind.onPointerDown(event);
      }
    },
    [rippleBind],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      // Defer to the ripple primitive — it ignores key repeats and silently
      // absorbs presses under reduced motion (Property 1 stays at zero).
      // The native button still fires `click` for Enter / Space, so this
      // is purely visual.
      rippleBind.onKeyDown(event);
    },
    [rippleBind],
  );

  // Style passed to the article. Skipping rotateX / rotateY under reduced
  // motion keeps Property 1's spy at zero AND avoids feeding non-CSS
  // MotionValue objects to a plain DOM element when `m()` short-circuits.
  const articleStyle: CSSProperties | undefined = reduced
    ? undefined
    : ({
        rotateX,
        rotateY,
        transformPerspective: 900,
      } as unknown as CSSProperties);

  // The cover artwork. Lumen ships a portrait composition that needs
  // `object-contain` over its theme background; everything else covers.
  const isPortraitContain = project.id === "lumen";
  const lumenScreenBackground = project.id === "lumen" ? "#f8f6f2" : undefined;

  const coverImage = (
    <Image
      src={project.image}
      alt={`${project.title} preview`}
      fill
      sizes="(max-width: 768px) 50vw, 240px"
      className={`transition-transform duration-500 ease-out group-hover:scale-[1.04] ${
        isPortraitContain ? "object-contain" : "object-cover"
      }`}
    />
  );

  // Branch on the discriminated union once so each branch gets the
  // strongly-typed variant-specific props (iOS gets dynamic-island /
  // home-indicator switches, Android gets `pillIndicator` and `finish:
  // "obsidian"`). Both branches skip the status bar so the cover image
  // can fill the screen without a chrome strip eating its top edge.
  const phoneCover =
    deviceVariant === "ios" ? (
      <PhoneFrame
        variant="ios"
        width={PHONE_FRAME_WIDTH}
        finish="black"
        showStatusBar={false}
        showDynamicIsland
        showHomeIndicator={false}
        screenBackground={lumenScreenBackground}
        screenColorScheme="light"
        className="select-none"
      >
        {coverImage}
      </PhoneFrame>
    ) : (
      <PhoneFrame
        variant="android"
        width={PHONE_FRAME_WIDTH}
        finish="obsidian"
        showStatusBar={false}
        pillIndicator={false}
        className="select-none"
      >
        {coverImage}
      </PhoneFrame>
    );

  return (
    <button
      ref={rippleRef}
      type="button"
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
      onKeyDown={handleKeyDown}
      aria-label={`Open ${project.title} preview`}
      className="group relative block w-full overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-accent)] focus-visible:ring-offset-2"
    >
      {/* Coarse-pointer ripple overlay (no-op container under fine pointers). */}
      {rippleNodes}
      <MotionArticle
        layoutId={`card-${project.id}`}
        variants={reduced ? undefined : motionVariants.staggeredReveal(REVEAL_STAGGER_STEP_MS)}
        initial={reduced ? false : "initial"}
        whileInView={reduced ? undefined : "animate"}
        viewport={{ once: true, amount: 0.2 }}
        whileHover={reduced ? undefined : { y: -4 }}
        transition={
          reduced ? undefined : { type: "spring", stiffness: 300, damping: 24 }
        }
        style={articleStyle}
        className="relative"
      >
        <div className="relative overflow-hidden rounded-xl border border-black/[0.06] bg-card-solid/60 shadow-sm transition-shadow duration-300 group-hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)] dark:border-white/[0.07] dark:bg-white/[0.02] dark:group-hover:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.85)]">
          {/* Cursor-follow highlight — only under fine pointers and when
              motion is allowed. CSS gates it under (pointer: coarse) too so
              touch devices that briefly flash hover state don't get a
              stale highlight. */}
          {!reduced ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-300 group-hover:opacity-100 [@media(pointer:coarse)]:hidden"
              style={{ background: highlight }}
            />
          ) : null}

          {/* Cover artwork inside a PhoneFrame, layoutId paired with the
              showcase's expanded cover (task 7.4). */}
          <MotionCover
            layoutId={`cover-${project.id}`}
            className="relative flex w-full items-center justify-center overflow-hidden border-b border-border bg-muted px-6 py-8 sm:py-10"
          >
            {phoneCover}
          </MotionCover>

          <div className="relative px-6 py-6 sm:px-7 sm:py-7">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="font-sans text-lg font-medium tracking-tight text-foreground sm:text-xl">
                {project.title}
              </h3>

              {/* External-link buttons. Stop propagation so the ripple/click
                  on a child link doesn't bubble up and re-fire `onOpen`. */}
              <span
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {project.links.github ? (
                  <a
                    href={project.links.github}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${project.title} GitHub`}
                    title="View on GitHub"
                    className="text-muted-2 transition-colors duration-150 hover:text-foreground"
                  >
                    <GitHubIcon className="size-[18px]" />
                  </a>
                ) : null}
                {project.links.site ? (
                  <a
                    href={project.links.site}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${project.title} website`}
                    title="Visit website"
                    className="text-muted-2 transition-colors duration-150 hover:text-foreground"
                  >
                    <ExternalLink className="size-5" />
                  </a>
                ) : null}
              </span>
            </div>

            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-2">
              {project.subtitle}
            </p>

            <p className="mb-6 max-w-[24rem] font-sans text-[15px] leading-[1.75] font-[450] text-muted-foreground sm:text-base">
              {project.description}
            </p>

            <div className="mt-auto flex flex-wrap items-center gap-3 opacity-95">
              {project.stack.map((id) => {
                const tech = techById.get(id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 font-sans text-[13px] font-medium text-muted-foreground"
                  >
                    <TechIcon id={id} size="sm" showLabel={false} />
                    {tech?.name ?? id}
                  </span>
                );
              })}
            </div>

            {/* "Tap to preview" affordance — fine-pointer hover only. The
                arrow slides on group-hover for the spec's "animated trailing
                arrow" beat. Hidden entirely under (pointer: coarse) so
                touch users see the ripple instead. */}
            <span
              aria-hidden
              className="mt-5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 [@media(pointer:coarse)]:hidden"
            >
              Tap to preview
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </span>
          </div>
        </div>
      </MotionArticle>
    </button>
  );
}
