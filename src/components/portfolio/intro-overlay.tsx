"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTextMotion } from "@/components/ui/scroll-text-motion";
import { INTRO_GROUPS } from "./intro-data";

interface IntroOverlayProps {
  /** Called once the outro animation has completed. */
  onDone: () => void;
  /** Element on the destination page that the logo should morph into. */
  morphTargetSelector?: string;
}

export function IntroOverlay({
  onDone,
  morphTargetSelector = "[data-morph-target='hero-name']",
}: IntroOverlayProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"intro" | "outro">("intro");
  const finishedRef = useRef(false);

  /**
   * Run the outro: morph the floating logo onto the portfolio's name and
   * dissolve everything else. The portfolio is mounted underneath via
   * IntroGate (with `data-intro-active`), so by the time the logo lands the
   * user can see what they're transitioning into.
   */
  const runOutro = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase("outro");

    const host = hostRef.current;
    if (!host) {
      onDone();
      return;
    }

    // Tell the portfolio to reveal itself in lock-step with the outro.
    document.documentElement.dataset.introActive = "outro";

    // Pause the page so the user is not still scrolling during the morph.
    window.scrollTo({ top: 0, behavior: "auto" });

    const logoEl = host.querySelector<HTMLElement>(".scroll-text-logo");
    const target = document.querySelector<HTMLElement>(morphTargetSelector);
    const everythingElse = host.querySelectorAll<HTMLElement>(
      ".scroll-text-content, .intro-skip, .intro-hint",
    );

    const tl = gsap.timeline({
      defaults: { ease: "expo.inOut" },
      onComplete: () => {
        try {
          window.localStorage.setItem("intro-seen", "1");
        } catch {
          /* storage disabled — ignore */
        }
        document.documentElement.dataset.introActive = "done";
        onDone();
        // Clean up the data attribute on the next tick so portfolio CSS
        // can finish any transition before reverting.
        window.setTimeout(() => {
          delete document.documentElement.dataset.introActive;
        }, 60);
      },
    });

    // 1. Snap small text away — quick scramble outward + fade.
    tl.to(
      everythingElse,
      {
        opacity: 0,
        filter: "blur(8px)",
        duration: 0.55,
      },
      0,
    );

    // 2. Morph the centered DHEERAJ logo onto the hero name.
    if (logoEl && target) {
      const logoRect = logoEl.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      // FLIP: keep the logo where it is visually but compute the delta
      // needed to land it on the hero name (top-left aligned, scaled).
      const deltaX =
        targetRect.left + targetRect.width / 2 -
        (logoRect.left + logoRect.width / 2);
      const deltaY =
        targetRect.top + targetRect.height / 2 -
        (logoRect.top + logoRect.height / 2);
      const scale = targetRect.height / logoRect.height;

      tl.to(
        logoEl,
        {
          x: deltaX,
          y: deltaY,
          scale,
          duration: 1.1,
          ease: "expo.inOut",
        },
        0.1,
      );
    }

    // 3. Iris/curtain reveal the portfolio. The black background of the
    //    intro fades out to black-zero so what's underneath becomes visible.
    tl.to(
      host,
      {
        backgroundColor: "rgba(0,0,0,0)",
        duration: 0.9,
      },
      0.45,
    );

    // 4. Soft scale + fade the host as the very last beat.
    tl.to(
      host,
      {
        opacity: 0,
        duration: 0.55,
        ease: "power3.out",
      },
      ">-0.1",
    );
  };

  // Auto-detect bottom of the intro
  useEffect(() => {
    const onScroll = () => {
      const { scrollTop } = document.documentElement;
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0 && scrollTop >= scrollHeight - 24) {
        runOutro();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc / Enter skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") runOutro();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={hostRef} className="intro-host" data-phase={phase}>
      <ScrollTextMotion groups={INTRO_GROUPS} logo="DHEERAJ" />

      {phase === "intro" ? (
        <>
          <div className="intro-hint">Scroll ↓</div>
          <button
            type="button"
            onClick={runOutro}
            className="intro-skip"
            aria-label="Skip intro"
          >
            Skip ↵
          </button>
        </>
      ) : null}
    </div>
  );
}
