"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import { ExternalLink } from "lucide-react";
import { projects, techById } from "@/lib/portfolio-data";
import { Reveal } from "./reveal";
import { SectionLabel } from "./section-label";
import { GitHubIcon } from "./brand-icons";
import { TechIcon } from "./tech-icon";
import { ProjectShowcase } from "./project-showcase";

type Project = (typeof projects)[number];

export function ProjectsSection() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = projects.find((p) => p.id === activeId) ?? null;

  return (
    <Reveal delay={120} className="mt-14">
      <section id="projects">
        <SectionLabel>Featured Projects</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isActive={activeId === project.id}
              onOpen={() => setActiveId(project.id)}
            />
          ))}
        </div>

        <AnimatePresence>
          {active ? (
            <ProjectShowcase
              project={active}
              techById={techById}
              onClose={() => setActiveId(null)}
            />
          ) : null}
        </AnimatePresence>
      </section>
    </Reveal>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*                          P R O J E C T   C A R D                          */
/* ──────────────────────────────────────────────────────────────────────── */

const TILT_RANGE = 6; // degrees max
const SPRING = { stiffness: 220, damping: 22, mass: 0.4 };

function ProjectCard({
  project,
  isActive,
  onOpen,
}: {
  project: Project;
  isActive: boolean;
  onOpen: () => void;
}) {
  // Mouse-driven 3D tilt
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [TILT_RANGE, -TILT_RANGE]), SPRING);
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-TILT_RANGE, TILT_RANGE]), SPRING);

  // Specular highlight that follows the cursor
  const highlightX = useTransform(mouseX, (v) => `${v * 100}%`);
  const highlightY = useTransform(mouseY, (v) => `${v * 100}%`);
  const highlight = useMotionTemplate`radial-gradient(220px circle at ${highlightX} ${highlightY}, rgba(99,102,241,0.18), transparent 60%)`;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const reset = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  return (
    <motion.article
      onMouseMove={handleMove}
      onMouseLeave={reset}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className="group relative"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${project.title} preview`}
        className="block w-full text-left"
        style={{ transform: "translateZ(0)" }}
      >
        <div
          className="relative overflow-hidden rounded-xl border border-black/[0.06] bg-card-solid/60 shadow-sm transition-shadow duration-300 group-hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)] dark:border-white/[0.07] dark:bg-white/[0.02] dark:group-hover:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.85)]"
        >
          {/* Cursor-follow highlight */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: highlight }}
          />

          {/* Card image */}
          <motion.div
            className="relative aspect-video w-full overflow-hidden border-b border-border bg-muted"
            animate={{ opacity: isActive ? 0 : 1 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image
              src={project.image}
              alt={`${project.title} preview`}
              fill
              sizes="(max-width: 768px) 100vw, 384px"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </motion.div>

          <div className="relative px-6 py-6 sm:px-7 sm:py-7">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="font-sans text-lg font-medium tracking-tight text-foreground sm:text-xl">
                {project.title}
              </h3>

              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
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
              </div>
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

            {/* "Tap to open" hint */}
            <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-2 transition-colors duration-200 group-hover:text-foreground">
              Tap to preview
              <span aria-hidden className="inline-block transition-transform duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </div>
        </div>
      </button>
    </motion.article>
  );
}
