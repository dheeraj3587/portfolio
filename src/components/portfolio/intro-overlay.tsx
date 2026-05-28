"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTextMotion } from "@/components/ui/scroll-text-motion";
import { motionDurations, useReducedMotionState } from "@/lib/motion-engine";
import { AndroidBootOverlay } from "./android-boot-overlay";
import { INTRO_GROUPS } from "./intro-data";

interface IntroOverlayProps {
  /** Called once the outro animation has completed. */
  onDone: () => void;
  /** Element on the destination page that the logo should morph into. */
  morphTargetSelector?: string;
}

/**
 * Three-phase intro lifecycle:
 *
 *   "boot"  → `AndroidBootOverlay` paints the Android 16 status-bar reveal
 *             and centered logo. Self-completes within 1800 ms.
 *   "intro" → existing `ScrollTextMotion` becomes the active surface, the
 *             skip pill / scroll hint render.
 *   "outro" → existing GSAP FLIP morph onto `[data-morph-target="hero-name"]`
 *             runs and the host fades out.
 *
 * `data-intro-active` on `<html>` follows the phase so portfolio CSS /
 * `globals.css` can pause animations until the overlay fully unmounts
 * (Requirement 13.6). It only flips to `"done"` from the unmount cleanup
 * — never inside the outro timeline — so the suppression rule covers the
 * full unmount tail.
 */
type IntroPhase = "boot" | "intro" | "outro";

export function IntroOverlay({
  onDone,
  morphTargetSelector = "[data-morph-target='hero-name']",
}: IntroOverlayProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<IntroPhase>("boot");
  const finishedRef = useRef(false);
  const reduced = useReducedMotionState();

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
        // NB: `data-intro-active` stays at "outro" here. The unmount-cleanup
        // effect flips it to "done" only after IntroOverlay has been removed
        // from the DOM, so portfolio animation suppression (Requirement
        // 13.6) covers the full unmount tail.
        onDone();
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

  /**
   * Skip handler shared by Esc/Enter and the on-screen button. During the
   * boot phase the FLIP source (`.scroll-text-logo`) does not yet exist, so
   * we advance to the intro phase first and defer `runOutro()` until
   * `ScrollTextMotion` has mounted and laid out (next two frames).
   */
  const skipIntro = () => {
    if (finishedRef.current) return;
    if (phase === "boot") {
      setPhase("intro");
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(runOutro);
      });
      return;
    }
    runOutro();
  };

  // Drive `data-intro-active` from the phase. The "outro" attribute write
  // is owned by `runOutro()` itself (it sets it before kicking off the
  // GSAP timeline), and the "done" write is owned by the unmount cleanup
  // below, so we only handle "boot" / "intro" here.
  useEffect(() => {
    if (phase === "boot") {
      document.documentElement.dataset.introActive = "boot";
    } else if (phase === "intro") {
      document.documentElement.dataset.introActive = "intro";
    }
  }, [phase]);

  // On unmount, flip to "done" and then clear the attribute on the next
  // tick so portfolio CSS can finish any transition before reverting.
  useEffect(() => {
    return () => {
      document.documentElement.dataset.introActive = "done";
      window.setTimeout(() => {
        if (document.documentElement.dataset.introActive === "done") {
          delete document.documentElement.dataset.introActive;
        }
      }, 60);
    };
  }, []);

  // Reduced-motion fast handoff (Requirement 13.5). `IntroGate` already
  // short-circuits to "skip" when reduced motion is on at first paint, so
  // this branch only ever runs if the user toggled the system preference
  // AFTER the gate decided to show the overlay. Either way we must reach
  // the same end state (`intro-seen=1`, `data-intro-active=done`, `onDone`)
  // within `motionDurations.reducedMotionHandoff` (200 ms).
  useEffect(() => {
    if (!reduced) return;
    if (finishedRef.current) return;
    finishedRef.current = true;
    const id = window.setTimeout(() => {
      document.documentElement.dataset.introActive = "done";
      try {
        window.localStorage.setItem("intro-seen", "1");
      } catch {
        /* storage disabled — ignore */
      }
      onDone();
    }, motionDurations.reducedMotionHandoff);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // Auto-detect bottom of the scroll-text segment. Only active during the
  // intro phase — there is nothing to scroll through during the boot.
  useEffect(() => {
    if (phase !== "intro") return;
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
  }, [phase]);

  // Esc / Enter skip — works in every phase via `skipIntro`.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") skipIntro();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div ref={hostRef} className="intro-host" data-phase={phase}>
      {phase === "boot" ? (
        <AndroidBootOverlay onComplete={() => setPhase("intro")} />
      ) : (
        <ScrollTextMotion groups={INTRO_GROUPS} logo="DHEERAJ" />
      )}

      {phase === "intro" ? (
        <>
          <div className="intro-hint">Scroll ↓</div>
          <button
            type="button"
            onClick={skipIntro}
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
