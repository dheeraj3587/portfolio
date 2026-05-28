"use client";

import { motion, type Variants } from "motion/react";

import {
  motionVariants,
  useReducedMotionState,
} from "@/lib/motion-engine";
import { cn } from "@/lib/utils";

import { TechIcon } from "./tech-icon";

const TECH_GRID_STEP_MS = 40; // within Requirement 6.4's [20, 80] ms band
const parentVariants: Variants = motionVariants.staggeredReveal(
  TECH_GRID_STEP_MS,
);

/**
 * Child variants paired with `motionVariants.staggeredReveal(stepMs)` so each
 * `TechIcon` rises 8 px and fades in as the parent's `staggerChildren` clock
 * ticks. Mirrors the parent's `initial`/`animate` shape so a single
 * `whileInView` on the grid drives both the parent and every child.
 */
const childVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export interface TechIconGridProps {
  techIds: ReadonlyArray<string>;
  className?: string;
}

/**
 * Grid wrapper for the Tech Stack icons. Applies the shared
 * `motionVariants.staggeredReveal(40)` parent variant on first viewport
 * intersection (Requirement 6.4 — per-icon delay within [20, 80] ms) and
 * delegates per-icon visuals + magnetic-hover behaviour to {@link TechIcon}.
 *
 * Under reduced motion the wrapper renders the grid statically without any
 * stagger so the section settles on first paint (Requirement 6.6).
 */
export function TechIconGrid({ techIds, className }: TechIconGridProps) {
  const reducedMotion = useReducedMotionState();
  const wrapperClass = cn(
    "flex flex-wrap items-center gap-x-6 gap-y-6 sm:gap-x-7",
    className,
  );

  if (reducedMotion) {
    return (
      <div className={wrapperClass}>
        {techIds.map((id) => (
          <TechIcon key={id} id={id} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={wrapperClass}
      variants={parentVariants}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, amount: 0.2 }}
    >
      {techIds.map((id) => (
        <motion.div
          key={id}
          variants={childVariants}
          className="inline-flex items-center justify-center"
        >
          <TechIcon id={id} />
        </motion.div>
      ))}
    </motion.div>
  );
}
