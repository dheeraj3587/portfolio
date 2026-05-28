"use client";

import Image from "next/image";
import {
  useState,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
  type SVGProps,
} from "react";
import {
  Android,
  Figma,
  Java,
  TypeScript,
  Github,
} from "@aliimam/logos";
import { motion, useMotionValue, useSpring } from "motion/react";
import {
  FloatingPortal,
  autoPlacement,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";

import { projects, techById, techStack } from "@/lib/portfolio-data";
import { useReducedMotionState } from "@/lib/motion-engine";
import { cn } from "@/lib/utils";

type LogoComponent = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number | string; className?: string }
>;

const aliLogoById: Record<string, LogoComponent> = {
  typescript: TypeScript,
  java: Java,
  github: Github,
  figma: Figma,
  android: Android,
};

// ---------------------------------------------------------------------------
// computeMagneticOffset — pure helper targeted by Property 19
// ---------------------------------------------------------------------------

/**
 * Magnetic-hover translation, in pixels, for a pointer at `pointer` (relative
 * to the icon's bounding-box origin) inside an icon whose bounding box is
 * `bounds.width × bounds.height`.
 *
 * Property 19 (validates Requirement 6.1):
 *   For any `pointer` and any `bounds` with `width > 0` and `height > 0`,
 *   the helper SHALL return `(dx, dy)` such that `|dx| ≤ 8` and `|dy| ≤ 8`.
 *
 * Implementation contract:
 *   - `cx = pointer.x - bounds.width / 2`,
 *     `cy = pointer.y - bounds.height / 2`
 *   - Scale by a magnetic factor (`0.4`) so the icon does not follow the
 *     cursor 1:1.
 *   - Clamp each axis to ±8 (`MAGNETIC_CAP_PX`).
 *   - When `bounds.width` or `bounds.height` is `≤ 0` (collapsed bounds),
 *     return `{ dx: 0, dy: 0 }`.
 *   - NaN / Infinity inputs are treated as `0` so callers never have to
 *     pre-validate `getBoundingClientRect()` output.
 *   - Pure: same input → same output.
 */
export function computeMagneticOffset(
  pointer: { x: number; y: number },
  bounds: { width: number; height: number },
): { dx: number; dy: number } {
  const px = finiteOrZero(pointer?.x);
  const py = finiteOrZero(pointer?.y);
  const w = finiteOrZero(bounds?.width);
  const h = finiteOrZero(bounds?.height);
  if (w <= 0 || h <= 0) return { dx: 0, dy: 0 };
  const cx = px - w / 2;
  const cy = py - h / 2;
  const dx = clamp(cx * MAGNETIC_FACTOR, -MAGNETIC_CAP_PX, MAGNETIC_CAP_PX);
  const dy = clamp(cy * MAGNETIC_FACTOR, -MAGNETIC_CAP_PX, MAGNETIC_CAP_PX);
  return { dx, dy };
}

const MAGNETIC_FACTOR = 0.4;
const MAGNETIC_CAP_PX = 8;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function finiteOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

// ---------------------------------------------------------------------------
// "Used in" hint resolution — scan projects.stack for the first match.
// ---------------------------------------------------------------------------

function resolveUsedInHint(techId: string): string | null {
  for (const project of projects) {
    if (project.stack.includes(techId)) {
      return `Used in ${project.title}`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// TechIcon — magnetic-hover + tooltip primary, plain-icon fallback for inline
// badge usages (showLabel = false) inside cards / lists.
// ---------------------------------------------------------------------------

export function TechIcon({
  id,
  size = "lg",
  showLabel = true,
}: {
  id: string;
  size?: "sm" | "lg";
  showLabel?: boolean;
}) {
  const tech = techById.get(id) ?? techStack[0];
  const isSmall = size === "sm";
  const iconSize = isSmall ? "size-7 sm:size-8" : "size-9 sm:size-11";
  const AliLogo = aliLogoById[id];

  const visual = AliLogo ? (
    <AliLogo
      className={cn("object-contain", iconSize)}
      aria-hidden="true"
    />
  ) : (
    <Image
      src={tech.src}
      alt={tech.name}
      width={44}
      height={44}
      className={cn(
        "object-contain",
        iconSize,
        tech.invertOnDark && "invert-on-dark",
        tech.invertOnLight && "invert-on-light",
      )}
    />
  );

  // Inline badges (size="sm" with showLabel=false used inside experience /
  // project cards / showcase) keep the lightweight static rendering they had
  // before this redesign — no tooltip, no magnetic transform — so list
  // layout / scroll performance is unchanged.
  if (!showLabel) {
    return (
      <span
        aria-label={tech.name}
        className="relative inline-flex items-center justify-center"
      >
        {visual}
      </span>
    );
  }

  return (
    <MagneticTechIconButton
      tech={tech}
      visual={visual}
    />
  );
}

interface MagneticTechIconButtonProps {
  tech: { id: string; name: string };
  visual: React.ReactNode;
}

function MagneticTechIconButton({
  tech,
  visual,
}: MagneticTechIconButtonProps) {
  const reducedMotion = useReducedMotionState();
  const [open, setOpen] = useState(false);

  // floating-ui positioning — autoPlacement keeps the tooltip inside the
  // viewport; offset() opens an 8px gap so the tooltip never overlaps the
  // press target; shift() slides it back into view on near-edge cases.
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "top",
    middleware: [
      offset(8),
      autoPlacement({ allowedPlacements: ["top", "bottom"] }),
      shift({ padding: 8 }),
    ],
  });

  // Hover (≥200 ms delay) + focus + click(tap) opens the tooltip; outside
  // click / Escape dismisses it (Requirements 6.2, 6.3, 6.5).
  const hover = useHover(context, { delay: { open: 200, close: 0 } });
  const focus = useFocus(context);
  const click = useClick(context, { event: "click", toggle: true });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    click,
    dismiss,
    role,
  ]);

  // Magnetic transform: two motion values capped at ±8 px and a useSpring
  // return-to-origin within ~400 ms on pointerleave (Requirement 6.1).
  // Stiffness/damping chosen so the spring settles inside 400 ms; matches
  // the 400 ms budget in the avatar parallax tilt.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 320, damping: 22, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 320, damping: 22, mass: 0.6 });

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const { dx, dy } = computeMagneticOffset(
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
      { width: rect.width, height: rect.height },
    );
    x.set(dx);
    y.set(dy);
  };

  const onPointerLeave = () => {
    // Spring returns to origin within 400 ms (Requirement 6.1).
    x.set(0);
    y.set(0);
  };

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        aria-label={tech.name}
        aria-describedby={open ? `tech-tip-${tech.id}` : undefined}
        onPointerMove={reducedMotion ? undefined : onPointerMove}
        onPointerLeave={reducedMotion ? undefined : onPointerLeave}
        className={cn(
          "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md p-0.5",
          // Visible focus ring sourced from the live Material accent.
          "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          "focus-visible:[outline-color:var(--ring-accent,currentColor)]",
        )}
        {...getReferenceProps()}
      >
        {reducedMotion ? (
          // Reduced motion: skip the magnetic spring entirely and render the
          // icon in its final position (Requirement 6.6).
          <span className="inline-flex items-center justify-center">
            {visual}
          </span>
        ) : (
          <motion.span
            style={{ x: sx, y: sy }}
            className="inline-flex items-center justify-center will-change-transform"
          >
            {visual}
          </motion.span>
        )}
      </button>
      {open ? (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            id={`tech-tip-${tech.id}`}
            role="tooltip"
            style={floatingStyles}
            className="z-50 pointer-events-none rounded-lg bg-foreground px-3 py-1.5 font-sans text-xs font-medium text-background shadow-lg"
            {...getFloatingProps()}
          >
            <span className="block whitespace-nowrap">{tech.name}</span>
            <UsedInHint techId={tech.id} />
          </div>
        </FloatingPortal>
      ) : null}
    </>
  );
}

function UsedInHint({ techId }: { techId: string }) {
  const hint = resolveUsedInHint(techId);
  if (!hint) return null;
  return (
    <span className="block whitespace-nowrap text-[10px] font-normal opacity-75">
      {hint}
    </span>
  );
}
