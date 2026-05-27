"use client";

import { useState, useSyncExternalStore } from "react";
import { IntroOverlay } from "./intro-overlay";

const STORAGE_KEY = "intro-seen";

type IntroDecision = "pending" | "show" | "skip";

const subscribe = () => () => {};

function getDecision(): IntroDecision {
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return "skip";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return "skip";
    }
    return "show";
  } catch {
    return "skip";
  }
}

const getServerDecision = (): IntroDecision => "pending";

/**
 * Wraps the portfolio.
 *
 * The intro and the portfolio are both mounted while the intro plays so the
 * outro can morph the floating DHEERAJ logo straight onto the hero name on
 * the portfolio underneath. While the intro is the active scroll surface,
 * the portfolio sits behind it inert (pointer-events: none, no a11y).
 *
 * On the second beat of the outro the intro fades away, revealing the
 * portfolio in place.
 */
export function IntroGate({ children }: { children: React.ReactNode }) {
  const decision = useSyncExternalStore(
    subscribe,
    getDecision,
    getServerDecision,
  );

  const [dismissed, setDismissed] = useState(false);
  const showIntro = decision === "show" && !dismissed;

  // SSR + first paint: render the portfolio normally so the static HTML
  // is meaningful. The first client commit will overlay the intro on top.
  if (decision === "pending") return <>{children}</>;

  if (decision === "skip" || dismissed) return <>{children}</>;

  return (
    <>
      {/* Portfolio mounted underneath, hidden but in the layout so the
          outro morph has a real DOM target to measure against. */}
      <div data-portfolio-under-intro="" aria-hidden={showIntro}>
        {children}
      </div>
      <IntroOverlay onDone={() => setDismissed(true)} />
    </>
  );
}
