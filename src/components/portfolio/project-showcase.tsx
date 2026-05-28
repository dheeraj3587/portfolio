"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, X } from "lucide-react";
import { TextMorph } from "torph/react";
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
}

const MOTION = {
  type: "spring" as const,
  stiffness: 280,
  damping: 30,
  mass: 0.9,
};

export function ProjectShowcase({
  project,
  techById,
  onClose,
}: ProjectShowcaseProps) {
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

  // ESC + arrow nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && screens.length > 0)
        setScreenIndex((i) => (i + 1) % screens.length);
      if (e.key === "ArrowLeft" && screens.length > 0)
        setScreenIndex((i) => (i - 1 + screens.length) % screens.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, screens.length]);

  // Auto-advance carousel
  useEffect(() => {
    if (!autoAdvanceEnabled) return;
    if (screens.length < 2) return;
    const id = window.setInterval(() => {
      setScreenIndex((i) => (i + 1) % screens.length);
    }, autoAdvanceInterval);
    return () => window.clearInterval(id);
  }, [autoAdvanceEnabled, autoAdvanceInterval, screens.length]);

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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
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
    <LumenProvider
      screenIndex={screenIndex}
      setScreenIndex={setScreenIndex}
    >
      {screenContent}
    </LumenProvider>
  ) : (
    screenContent
  );

  if (typeof document === "undefined") return null;

  const overlay = (
    <motion.div
      key="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[120] bg-white/60 text-foreground backdrop-blur-2xl backdrop-saturate-150 dark:bg-black/60 dark:text-white"
      onClick={onClose}
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
          initial={{ opacity: 0, scale: 0.86, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={MOTION}
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

        {/* ── Side panel — animated hero card matching reference spec ─ */}
        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex w-full max-w-md flex-col lg:max-w-[28rem]"
        >
          {/* Outer card — `bg-neutral-100` over light, neutral-900 over dark */}
          <div className="flex h-full w-full flex-col rounded-3xl border border-border bg-neutral-100 shadow-[0_30px_80px_-30px_rgba(20,20,40,0.18)] dark:bg-neutral-900 dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]">
            {/* Inner hero tile — animated visual lives here */}
            <div className="relative h-[260px] w-full overflow-hidden rounded-3xl bg-neutral-50 dark:bg-neutral-800/60">
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
            </div>

            {/* Body */}
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
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.4 + i * 0.04,
                          duration: 0.4,
                          ease: [0.16, 1, 0.3, 1],
                        }}
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
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 36,
                            }}
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
          </div>
        </motion.aside>
      </div>

      {/* Top-left badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.4 }}
        className="pointer-events-none absolute left-6 top-6 z-20 hidden items-center gap-2.5 lg:flex"
      >
        <span className="size-1.5 rounded-full bg-neutral-900 status-dot dark:bg-white" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
          live preview
        </span>
      </motion.div>

      {/* Close button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        type="button"
        onClick={onClose}
        aria-label="Close project preview"
        className="group absolute right-5 top-5 z-20 inline-flex size-11 items-center justify-center rounded-full border border-border bg-neutral-50 text-neutral-700 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white hover:text-neutral-900 dark:bg-neutral-900/80 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
      >
        <X className="size-5 transition-transform duration-200 group-hover:rotate-90" />
      </motion.button>

      {/* Bottom hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
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
