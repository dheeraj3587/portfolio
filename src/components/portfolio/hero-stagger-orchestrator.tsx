"use client";

/**
 * HeroStaggerOrchestrator — choreographs the hero block reveal (Task 5.4).
 *
 * Wraps the avatar / name / rotating role / meta columns / bio / DSA stats /
 * social icons in a single `<motion.div>` driven by
 * `motionVariants.staggeredReveal(80)`. Each first-level child is wrapped
 * in a `<HeroStaggerItem>` so motion's `staggerChildren` can cascade per
 * element with the per-step delay landing in the [40, 160] ms window
 * mandated by Requirement 2.1 (80 ms × childIndex ∈ [0, 7] keeps every
 * delay inside the bound; see Property 17 in
 * `motion-engine.ts::staggerDelay`).
 *
 * Behavior:
 *   • Trigger: `whileInView` with `viewport={{ once: true }}` so the
 *     cascade plays exactly once when the hero scrolls into view
 *     (Requirement 2.1: "WHEN the hero section is visible …").
 *   • Reduced motion: `useReducedMotionState() === true` short-circuits
 *     to a passthrough — the children are rendered in their final visual
 *     state with no `motion.div`, no spring, no stagger
 *     (Requirements 2.6, 17.2).
 *
 * Usage:
 *
 *   <HeroStaggerOrchestrator>
 *     <HeroStaggerItem>{avatarBlock}</HeroStaggerItem>
 *     <HeroStaggerItem>{metaRow}</HeroStaggerItem>
 *     ...
 *   </HeroStaggerOrchestrator>
 */

import { type ReactNode } from "react";
import { motion, type Variants } from "motion/react";

import { motionVariants, useReducedMotionState } from "@/lib/motion-engine";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Per-step stagger in milliseconds. Picked at 80 ms so that with the hero
 * having ≤ 7 first-level children (avatar / name+role / meta / bio / DSA /
 * socials …), every per-element delay `(80 * i) / 1000` lands inside the
 * `[40, 160]` ms window enforced by Requirement 2.1 / Property 17.
 */
const STAGGER_STEP_MS = 80;

const PARENT_VARIANTS = motionVariants.staggeredReveal(STAGGER_STEP_MS);

/**
 * Child variant exported so consumers can drive their own elements through
 * the same cascade. The shape mirrors the parent's (`{ opacity: 0, y: 8 }
 * → { opacity: 1, y: 0 }`) so motion's `staggerChildren` reads the same
 * keys on both ends.
 */
export const heroStaggerChildVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

// ---------------------------------------------------------------------------
// HeroStaggerItem — child wrapper carrying the per-element variant
// ---------------------------------------------------------------------------

export interface HeroStaggerItemProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a single hero child in a `<motion.div>` carrying
 * {@link heroStaggerChildVariants}. Under reduced motion, falls through to
 * a plain `<div>` with no motion props so the parent can short-circuit
 * cleanly.
 */
export function HeroStaggerItem({
  children,
  className,
}: HeroStaggerItemProps) {
  const reduced = useReducedMotionState();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div className={className} variants={heroStaggerChildVariants}>
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// HeroStaggerOrchestrator — parent
// ---------------------------------------------------------------------------

export interface HeroStaggerOrchestratorProps {
  children: ReactNode;
  className?: string;
}

export function HeroStaggerOrchestrator({
  children,
  className,
}: HeroStaggerOrchestratorProps) {
  const reduced = useReducedMotionState();

  if (reduced) {
    // Reduced motion: render children in their final visual state with
    // no motion, no spring, no stagger (Requirement 2.6).
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={PARENT_VARIANTS}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, amount: 0.1 }}
    >
      {children}
    </motion.div>
  );
}

export default HeroStaggerOrchestrator;
