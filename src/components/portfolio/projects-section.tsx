"use client";

/**
 * ProjectsSection — owner of the container-transform state machine
 * (task 7.3, Requirements 5.1 / 5.5).
 *
 * State contract:
 *   - `activeProjectId: string | null` — the id of the project whose
 *     showcase surface is currently open. `null` means no showcase is
 *     mounted and the grid is in its idle, scrollable state.
 *   - `isAnimating: boolean` — the transform lock. Flips to `true` the
 *     moment a card is activated and back to `false` once `motion`
 *     reports the layout transition has settled (driven by
 *     `ProjectShowcase` via `onTransformSettle` in task 7.4).
 *
 * Activation guard (Requirement 5.5):
 *   While `isAnimating === true`, `handleOpen` is a no-op. A second tap
 *   on a card during the morph is silently ignored — there is no queued
 *   animation, no flicker, no race.
 *
 * Card ref pool (Requirement 5.7 / 19.6):
 *   Each `ProjectCard` registers its underlying `<button>` element with
 *   `cardRefMap.current` on mount and removes itself on unmount. The
 *   showcase reads this map on close to restore focus to the originating
 *   card. The map is intentionally a `useRef` rather than `useState` so
 *   registration / removal does not cause re-renders.
 *
 * Layout-shared morph:
 *   `activeProjectId` selects the active project, which is then passed
 *   to `<ProjectShowcase>`. Both the card (via task 7.2) and the
 *   showcase (via task 7.4) declare matching `layoutId`s such as
 *   `card-${id}` and `cover-${id}`, so `motion` runs the
 *   container-transform automatically — no hand-rolled FLIP math.
 */

import { useCallback, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import { projects, techById } from "@/lib/portfolio-data";
import { Reveal } from "./reveal";
import { SectionLabel } from "./section-label";
import { ProjectCard } from "./project-card";

/**
 * `ProjectShowcase` is a heavy client surface — it pulls in `motion`'s
 * shared-layout machinery, the focus-trap hook, and the device frame
 * tree. Loading it through `next/dynamic({ ssr: false })` keeps that
 * weight out of the initial page payload (task 16.1, Requirements 16.1 /
 * 16.3); the chunk only arrives once a project card is activated.
 *
 * The showcase mounts inside `<AnimatePresence>` only when a project is
 * active, so the natural `loading` state is "nothing" and the dynamic
 * import never blocks the section's idle render.
 */
const ProjectShowcase = dynamic(
  () => import("./project-showcase").then((m) => m.ProjectShowcase),
  { ssr: false },
);

export function ProjectsSection() {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Ref pool used to restore focus to the originating card after the
  // showcase closes. Not state — registration must not trigger re-renders.
  const cardRefMap = useRef<Map<string, HTMLElement>>(new Map());

  const registerCardRef = useCallback(
    (id: string, el: HTMLElement | null) => {
      if (el) {
        cardRefMap.current.set(id, el);
      } else {
        cardRefMap.current.delete(id);
      }
    },
    [],
  );

  // Activation gate (Requirement 5.5). A second activation while the
  // transform is still running is silently dropped.
  const handleOpen = useCallback(
    (id: string) => {
      if (isAnimating) return;
      setActiveProjectId(id);
      setIsAnimating(true);
    },
    [isAnimating],
  );

  // Close just clears the active project; whether `isAnimating` should
  // flip immediately or after the reverse transform settles is the
  // showcase's concern (task 7.4 wires `onTransformSettle`).
  const handleClose = useCallback(() => {
    setActiveProjectId(null);
  }, []);

  // Called by `ProjectShowcase` when `motion` reports the layout
  // transition has finished (task 7.4). Releases the activation gate.
  const handleTransformSettle = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const active = projects.find((p) => p.id === activeProjectId) ?? null;

  return (
    <Reveal delay={120} className="mt-14">
      <section id="projects" className="scroll-mt-32">
        <SectionLabel>Featured Projects</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              techById={techById}
              onOpen={handleOpen}
              registerRef={registerCardRef}
            />
          ))}
        </div>

        <AnimatePresence>
          {active ? (
            <ProjectShowcase
              project={active}
              techById={techById}
              onClose={handleClose}
              cardRefMap={cardRefMap}
              isAnimating={isAnimating}
              onTransformSettle={handleTransformSettle}
            />
          ) : null}
        </AnimatePresence>
      </section>
    </Reveal>
  );
}
