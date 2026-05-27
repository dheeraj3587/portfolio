"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, X } from "lucide-react";
import type { projects, techById as TechByIdType } from "@/lib/portfolio-data";
import { GitHubIcon } from "./brand-icons";
import { IPhoneFrame } from "@/components/ui/iphone-frame";
import { phoneScreensByProject } from "./phone-screens";

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
  const screens = phoneScreensByProject[project.id] ?? [];
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
    if (screens.length < 2) return;
    const id = window.setInterval(() => {
      setScreenIndex((i) => (i + 1) % screens.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [screens.length]);

  const ActiveScreen = screens[screenIndex]?.Component ?? null;

  if (typeof document === "undefined") return null;

  const overlay = (
    <motion.div
      key="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[120] bg-black"
      onClick={onClose}
    >
      {/* Layered radial vignette for premium black depth — pure greyscale */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80vmin 80vmin at 50% 45%, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0) 60%)",
        }}
      />

      {/* Stage */}
      <div
        className="relative z-10 flex h-dvh w-full flex-col items-center justify-center gap-10 px-6 py-10 lg:flex-row lg:gap-20 lg:px-16"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Phone */}
        <motion.div
          initial={{ opacity: 0, scale: 0.86, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={MOTION}
          className="relative flex shrink-0 items-center justify-center"
          style={{
            filter: "drop-shadow(0 50px 80px rgba(0,0,0,0.55)) drop-shadow(0 12px 30px rgba(0,0,0,0.35))",
          }}
        >
          <IPhoneFrame
            width={phoneWidth}
            className="select-none"
            finish="black"
            screenBackground={screens[screenIndex]?.screenBackground}
          >
            {ActiveScreen ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={screens[screenIndex]?.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
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
            )}
          </IPhoneFrame>
        </motion.div>

        {/* Side panel */}
        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex w-full max-w-md flex-col gap-6 text-white lg:max-w-lg lg:gap-7"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/45">
              {project.subtitle}
            </p>
            <h2 className="mt-2 font-sans text-3xl font-semibold tracking-tight lg:text-[2.75rem] lg:leading-[1.05]">
              {project.title}
            </h2>
          </div>

          <p className="font-sans text-[15px] leading-[1.7] text-white/70 lg:text-[17px] lg:leading-[1.65]">
            {project.description}
          </p>

          <ul className="flex flex-wrap gap-2">
            {project.stack.map((id, i) => {
              const tech = techById.get(id);
              return (
                <motion.li
                  key={id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.45 + i * 0.04,
                    duration: 0.4,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 font-sans text-[12px] font-medium text-white/85 backdrop-blur"
                >
                  {tech?.name ?? id}
                </motion.li>
              );
            })}
          </ul>

          {screens.length > 1 ? (
            <div className="flex items-center gap-3">
              {screens.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScreenIndex(i)}
                  aria-label={`Show ${s.label}`}
                  aria-current={i === screenIndex}
                  className="group inline-flex items-center gap-2"
                >
                  <span
                    className={`h-[2px] rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      i === screenIndex
                        ? "w-12 bg-white"
                        : "w-6 bg-white/20 group-hover:bg-white/40"
                    }`}
                  />
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-300 ${
                      i === screenIndex ? "text-white" : "text-white/40"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2.5">
            {project.links.site ? (
              <a
                href={project.links.site}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-sans text-sm font-medium text-black transition-transform duration-300 ease-out hover:-translate-y-0.5"
              >
                Visit live site
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            ) : null}
            {project.links.github ? (
              <a
                href={project.links.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-white/[0.1]"
              >
                <GitHubIcon className="size-4" />
                View source
              </a>
            ) : null}
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
        <span className="size-1.5 rounded-full bg-white status-dot" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
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
        className="group absolute right-5 top-5 z-20 inline-flex size-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/70 backdrop-blur transition-all duration-200 hover:scale-105 hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
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
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/30">
          esc to close · ← → switch screens
        </span>
      </motion.div>
    </motion.div>
  );

  return createPortal(overlay, document.body);
}
