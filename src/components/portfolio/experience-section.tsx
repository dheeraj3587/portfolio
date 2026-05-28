"use client";

/**
 * ExperienceSection — vertical work-history timeline with rail-grow + per-
 * entry slide reveal motion (Requirement 7).
 *
 * Validates Requirements 7.1, 7.2, 7.3, 7.4, 7.5:
 *   - 7.1: The vertical rail animates from top to bottom (scaleY 0 → 1 with
 *     `originY: 0`) and completes within 1200ms — sourced from
 *     `motionDurations.timelineRail`.
 *   - 7.2: Each entry slides in horizontally (x: -24 → 0) with an opacity
 *     transition completing within 500ms when the entry node enters the
 *     viewport. The 24px slide budget matches the acceptance criterion.
 *   - 7.3: The data shape and ordering from `portfolio-data.ts` are
 *     preserved — the iteration uses `experience` as-is.
 *   - 7.4: A fine-pointer hover lifts the entry with a translate-y of -4px
 *     (whileHover) and a subtle shadow (Tailwind `hover:shadow-md` /
 *     `hover:shadow-black/5`).
 *   - 7.5: When `useReducedMotionState()` returns true, the rail and every
 *     entry render in their final visual state — no growth, no slide, no
 *     hover translation timeline. This keeps Property 1's spy at zero.
 */

import { motion } from "motion/react";

import { experience, techById } from "@/lib/portfolio-data";
import { motionDurations, useReducedMotionState } from "@/lib/motion-engine";
import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";
import { SectionLabel } from "./section-label";
import { TechIcon } from "./tech-icon";

const RAIL_DURATION_S = motionDurations.timelineRail / 1000; // 1.2s
const ENTRY_DURATION_S = 0.5; // Requirement 7.2: ≤ 500ms
const ENTRY_SLIDE_PX = 24; // Requirement 7.2: ≤ 24px
const HOVER_LIFT_PX = -4; // Requirement 7.4: ≤ 4px

export function ExperienceSection() {
  const reduced = useReducedMotionState();

  return (
    <Reveal delay={160} className="mt-16">
      <section id="experience" className="scroll-mt-32">
        <SectionLabel>Experience</SectionLabel>
        <div className="relative">
          {/* Vertical timeline rail (Requirement 7.1) */}
          {reduced ? (
            <div
              className="absolute bottom-2 left-[3px] top-2 w-px bg-border"
              aria-hidden="true"
            />
          ) : (
            <motion.div
              className="absolute bottom-2 left-[3px] top-2 w-px bg-border"
              aria-hidden="true"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: RAIL_DURATION_S, ease: "easeOut" }}
              style={{ originY: 0 }}
            />
          )}
          <ol className="space-y-12">
            {experience.map((item) => (
              <ExperienceEntry
                key={`${item.role}-${item.company}`}
                item={item}
                reduced={reduced}
              />
            ))}
          </ol>
        </div>
      </section>
    </Reveal>
  );
}

interface ExperienceEntryProps {
  item: (typeof experience)[number];
  reduced: boolean;
}

function ExperienceEntry({ item, reduced }: ExperienceEntryProps) {
  const dot = (
    <span
      className={cn(
        "absolute left-0 top-[7px] size-[7px] rounded-full",
        item.active
          ? "bg-success ring-4 ring-emerald-400/15 status-dot"
          : "bg-zinc-400 dark:bg-zinc-500",
      )}
      aria-hidden="true"
    />
  );

  const body = (
    <>
      {/* Two-column lockup: role/body on left, location/date on right */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-12">
        {/* Left column — role, company, body, bullets */}
        <div className="md:col-span-8">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="font-sans text-lg font-medium tracking-tight text-foreground sm:text-xl">
              {item.role}
            </h3>
            <span className="text-muted-2">·</span>
            <span className="font-sans text-[15px] font-[450] text-muted-foreground sm:text-base">
              {item.company}
            </span>
          </div>
          <p className="mt-3 font-sans text-base font-[450] leading-[1.7] text-muted-foreground sm:text-[17px]">
            {item.body}
          </p>
          <ul className="mt-3 space-y-1.5">
            {item.bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-3 font-sans text-[15px] font-[450] leading-[1.65] text-muted-foreground sm:text-base"
              >
                <span className="mt-[9px] size-[3px] shrink-0 rounded-full bg-muted-2" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right column — date and location */}
        <div className="md:col-span-4 md:text-right">
          <div className="font-sans text-[13px] font-medium tabular-nums text-foreground sm:text-sm">
            {item.date}
          </div>
          <div className="mt-1 font-sans text-sm text-muted-2">
            {item.location}
          </div>
        </div>
      </div>

      {/* Stack chips full width below */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        {item.stack.map((id) => {
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
    </>
  );

  // Reduced-motion branch (Requirement 7.5): render the final visual state
  // with no slide, no opacity transition, and no hover translation timeline.
  if (reduced) {
    return (
      <li className="relative pl-7">
        {dot}
        {body}
      </li>
    );
  }

  // Animated branch (Requirements 7.2, 7.4): slide-in reveal on viewport
  // entry plus a fine-pointer hover lift with a subtle shadow.
  return (
    <motion.li
      className="relative rounded-lg pl-7 transition-shadow hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/30"
      initial={{ x: -ENTRY_SLIDE_PX, opacity: 0 }}
      whileInView={{ x: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: ENTRY_DURATION_S, ease: "easeOut" }}
      whileHover={{ y: HOVER_LIFT_PX }}
    >
      {dot}
      {body}
    </motion.li>
  );
}
