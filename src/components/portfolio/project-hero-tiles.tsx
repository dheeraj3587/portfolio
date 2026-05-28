"use client";

// Animated hero tiles rendered inside the `ProjectShowcase` side card,
// directly inspired by the GridAnimatedCards reference design. Each
// project gets a tile that loops through phases on a timer, mirroring the
// reference cards' card-stack / progress-bar / segmented-fill aesthetics.
//
// Two variants are shipped here:
//   - `<LumenHeroTile />` — stacks three "concept starter" mini-cards that
//     orbit through fan / column / shuffle phases (like card-animation-01).
//   - `<ChimeHeroTile />` — pulses through eight inset progress segments
//     (like card-animation-02), badged "Live Chat".
//
// Both consume the same overall surface, so they slot into the white
// inner tile of the showcase card without any layout change. They are
// designed to scale gracefully via `className` on the outer wrapper.

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  Camera,
  ImageIcon,
  ListChecks,
  MessagesSquare,
  Sparkles,
  Wand2,
} from "lucide-react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────── */
/*                            L U M E N   T I L E                          */
/* ────────────────────────────────────────────────────────────────────── */

const LUMEN_CARDS = [
  {
    title: "Moodboard ready",
    subtitle: "12 references · 4 palettes",
    Icon: ImageIcon,
    iconClass: "text-violet-500",
    barClass:
      "from-violet-200 to-violet-100/30 dark:from-violet-500/40 dark:to-violet-500/10",
  },
  {
    title: "Shot list drafted",
    subtitle: "8 angles · 3 setups",
    Icon: ListChecks,
    iconClass: "text-rose-500",
    barClass:
      "from-rose-200 to-rose-100/30 dark:from-rose-500/40 dark:to-rose-500/10",
  },
  {
    title: "Hook · 3 variants",
    subtitle: "editorial · cinematic",
    Icon: Wand2,
    iconClass: "text-amber-500",
    barClass:
      "from-amber-200 to-amber-100/30 dark:from-amber-500/40 dark:to-amber-500/10",
  },
] as const;

const LUMEN_W = 240;
const LUMEN_H = 78;
const LUMEN_STEP = LUMEN_H + 8;

type LumenPhase = Array<{
  x: number;
  y: number;
  rotate: number;
  opacity: number;
  scale: number;
  zIndex: number;
}>;

const LUMEN_PHASES: LumenPhase[] = [
  // Phase 0 — single centered card, others hidden
  [
    { x: 0, y: 0, rotate: 0, opacity: 0, scale: 0.82, zIndex: 0 },
    { x: 0, y: 0, rotate: 0, opacity: 0, scale: 0.82, zIndex: 0 },
    { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1, zIndex: 2 },
  ],
  // Phase 1 — fanned diagonally
  [
    { x: -55, y: -65, rotate: 0, opacity: 1, scale: 1, zIndex: 1 },
    { x: 55, y: 0, rotate: 0, opacity: 1, scale: 1, zIndex: 2 },
    { x: -55, y: 65, rotate: 0, opacity: 1, scale: 1, zIndex: 3 },
  ],
  // Phase 2 — clean vertical stack
  [
    { x: 0, y: -LUMEN_STEP, rotate: 0, opacity: 1, scale: 1, zIndex: 3 },
    { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1, zIndex: 2 },
    { x: 0, y: LUMEN_STEP, rotate: 0, opacity: 1, scale: 1, zIndex: 1 },
  ],
  // Phase 3 — shuffle, slight rotation
  [
    { x: 0, y: -LUMEN_STEP + 30, rotate: 5, opacity: 1, scale: 1, zIndex: 1 },
    { x: 0, y: 0, rotate: -5, opacity: 1, scale: 1, zIndex: 2 },
    { x: 0, y: LUMEN_STEP - 30, rotate: 5, opacity: 1, scale: 1, zIndex: 3 },
  ],
];

const LUMEN_SPRING = {
  type: "spring" as const,
  stiffness: 300,
  damping: 22,
  mass: 1,
};

const HOLD_MS = 1100;

export function LumenHeroTile({ className }: { className?: string }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(
      () => setPhase((p) => (p + 1) % LUMEN_PHASES.length),
      HOLD_MS,
    );
    return () => window.clearTimeout(t);
  }, [phase]);

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden",
        className,
      )}
    >
      <div className="relative h-0 w-0">
        {LUMEN_CARDS.map((card, i) => {
          const pos = LUMEN_PHASES[phase][i];
          return (
            <motion.div
              key={i}
              className="absolute"
              style={{
                width: LUMEN_W,
                height: LUMEN_H,
                top: -LUMEN_H / 2,
                left: -LUMEN_W / 2,
                zIndex: pos.zIndex,
              }}
              animate={{
                x: pos.x,
                y: pos.y,
                rotate: pos.rotate,
                opacity: pos.opacity,
                scale: pos.scale,
              }}
              transition={LUMEN_SPRING}
            >
              <ConceptCard
                title={card.title}
                subtitle={card.subtitle}
                Icon={card.Icon}
                iconClass={card.iconClass}
                barClass={card.barClass}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ConceptCard({
  title,
  subtitle,
  Icon,
  iconClass,
  barClass,
}: {
  title: string;
  subtitle: string;
  Icon: typeof Camera;
  iconClass: string;
  barClass: string;
}) {
  return (
    <div className="relative flex h-full w-full flex-col justify-between rounded-xl border border-neutral-200 bg-white p-3 shadow-[0_8px_24px_-12px_rgba(20,20,40,0.18)] before:absolute before:inset-0 before:rounded-xl before:opacity-20 before:shadow-md before:content-[''] dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <Icon className={cn("size-4", iconClass)} strokeWidth={1.6} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold leading-tight text-neutral-900 dark:text-neutral-100">
            {title}
          </p>
          <p className="truncate text-[9.5px] leading-tight text-neutral-400">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="mt-1 flex flex-col gap-1">
        {[100, 78, 58].map((pct, j) => (
          <div
            key={j}
            className={cn(
              "h-[5px] rounded-full bg-gradient-to-r",
              barClass,
            )}
            style={{ width: `${pct}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*                            C H I M E   T I L E                          */
/* ────────────────────────────────────────────────────────────────────── */

const CHIME_PHASES = 8;
const CHIME_HOLD_MS = 700;
const CHIME_SPRING = {
  type: "spring" as const,
  stiffness: 200,
  damping: 22,
  mass: 1,
};

export function ChimeHeroTile({ className }: { className?: string }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(
      () => setPhase((p) => (p + 1) % CHIME_PHASES),
      CHIME_HOLD_MS,
    );
    return () => window.clearTimeout(t);
  }, [phase]);

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden",
        className,
      )}
    >
      <div className="relative h-[140px] w-[260px] rounded-xl border border-neutral-200 bg-white p-3 shadow-[0_8px_24px_-12px_rgba(20,20,40,0.18)] dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex h-full w-full flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
              <MessagesSquare
                className="size-4 text-emerald-500"
                strokeWidth={1.6}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold leading-tight text-neutral-900 dark:text-neutral-100">
                Live · Real-time chat
              </p>
              <p className="truncate text-[9.5px] leading-tight text-neutral-400">
                FCM push · read receipts
              </p>
            </div>
          </div>

          <div className="mt-3 flex h-[40px] flex-grow items-center gap-1">
            {Array.from({ length: CHIME_PHASES }).map((_, i) => {
              const isCompleted = i < phase;
              const isActive = i === phase;
              return (
                <div
                  key={i}
                  className="relative h-full w-12 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <motion.div
                    className="absolute inset-0 h-full bg-gradient-to-b from-emerald-400 to-emerald-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                    initial={false}
                    animate={{
                      width: isCompleted || isActive ? "100%" : "0%",
                      opacity: isActive ? 1 : isCompleted ? 0.7 : 0,
                    }}
                    transition={CHIME_SPRING}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*                          F A L L B A C K   T I L E                      */
/* ────────────────────────────────────────────────────────────────────── */

export function GenericHeroTile({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        className,
      )}
    >
      <Sparkles className="size-12 text-neutral-300 dark:text-neutral-700" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*                                S W I T C H                              */
/* ────────────────────────────────────────────────────────────────────── */

export function ProjectHeroTile({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  if (projectId === "lumen") return <LumenHeroTile className={className} />;
  if (projectId === "chime") return <ChimeHeroTile className={className} />;
  return <GenericHeroTile className={className} />;
}
