"use client";

// Lumen home screen — greeting, heading, the animated `Hero_Orb`, and the
// bottom-pinned `Input_Bar`. The screen never draws its own status bar /
// Dynamic Island / side buttons / home indicator (Req 3.9, 6.3); those
// belong to `IPhoneFrame`. The root background uses the
// `var(--device-screen-bg, #f8f6f2)` literal so the registry test's
// background invariant (Property 3) and the status-bar tint resolution in
// `IPhoneFrame` keep working.
//
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 3.9, 6.1, 6.3,
//               7.1, 7.2, 7.3, 7.4, 7.5, 8.3

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { InputBar } from "./input-bar";
import { useLumen } from "./lumen-context";
import { HERO_ORB_PRIMARY } from "./lumen-data";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Static poster fallback used when reduced-motion is active or when the
 * `<video>` errors. Rendered as a styled `<div>` so we don't depend on a
 * separate poster asset.
 */
function HeroOrbPoster() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 rounded-full"
      style={{
        background:
          "radial-gradient(circle at 32% 28%, #d8c8ff 0%, #a685ff 32%, #6f47e0 62%, #2e1463 100%)",
        boxShadow:
          "inset 0 6px 18px rgba(255,255,255,0.35), inset 0 -10px 28px rgba(20,5,55,0.55), 0 18px 36px -12px rgba(95,55,210,0.45)",
      }}
    />
  );
}

/**
 * `Hero_Orb` — the centrepiece animation. Two render paths:
 *
 * 1. Reduced motion (Req 3.6) → static poster fallback.
 * 2. Default → autoplaying inline `<video>` (Req 3.4, 7.5) with a
 *    pause-before-unmount cleanup (Req 7.3) and an `onError` swap to the
 *    poster fallback so a 404 / decode error doesn't leave a black square.
 *
 * The component is only mounted when `phase !== "results"` (Req 7.1, 7.4 —
 * see callsite below); on transition to `results` React unmounts this tree
 * and the `useLayoutEffect` cleanup pauses the element synchronously
 * BEFORE the DOM node detaches.
 */
function HeroOrb({ onEnded }: { onEnded: () => void }) {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [errored, setErrored] = useState(false);

  // Pause-before-unmount: required so the `<video>` stops decoding before
  // React detaches the DOM node (Req 7.3).
  useLayoutEffect(() => {
    const node = videoRef.current;
    return () => {
      node?.pause();
    };
  }, []);

  // Autoplay is unreliable on its own:
  //   1. React StrictMode in dev simulates an unmount → the cleanup above
  //      fires `pause()` on the same DOM node React then reuses on the
  //      second mount, so the orb sits frozen on the first frame.
  //   2. Some browsers (Safari especially) ignore the `autoPlay` attribute
  //      when the element is mounted inside an animated parent, but honour
  //      a programmatic `play()` call once metadata is ready.
  // Calling `play()` from an effect handles both cases.
  useEffect(() => {
    if (reducedMotion || errored) return;
    const node = videoRef.current;
    if (!node) return;
    const result = node.play();
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  }, [reducedMotion, errored]);

  // Reduced-motion users don't get the video, so they also can't observe
  // `onEnded`. Fire the callback once on mount in that path so the chat
  // transition still happens (with no animation to wait on).
  useEffect(() => {
    if (!reducedMotion) return;
    const id = window.setTimeout(onEnded, 0);
    return () => window.clearTimeout(id);
  }, [reducedMotion, onEnded]);

  const showVideo = !reducedMotion && !errored;

  return (
    <div className="relative aspect-square w-full" aria-hidden="true">
      {showVideo ? (
        <video
          ref={videoRef}
          muted
          autoPlay
          playsInline
          preload="auto"
          aria-hidden="true"
          onError={() => setErrored(true)}
          onEnded={onEnded}
          className="absolute inset-0 h-full w-full rounded-full object-cover"
        >
          <source src={HERO_ORB_PRIMARY} type="video/mp4" />
        </video>
      ) : (
        <HeroOrbPoster />
      )}
    </div>
  );
}

export function LumenHomeScreen() {
  const { state, autoAdvance } = useLumen();
  const showHeroOrb = state.phase !== "results";

  return (
    <div
      // Root background uses the exact literal asserted by Property 3 in
      // `registry.test.tsx`. Do NOT switch to a Tailwind class.
      style={{ background: "var(--device-screen-bg, #f8f6f2)" }}
      className="flex h-full w-full flex-col"
    >
      {/* Top section: orb floats centered, greeting and heading sit
          beneath it (matches the reference layout). The orb is unmounted
          on `phase === "results"` so the <video> stops issuing network
          requests and pauses its decode pipeline. */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pt-8">
        <div className="flex flex-1 items-center justify-center">
          {showHeroOrb ? (
            <div className="relative w-[220px]">
              <HeroOrb onEnded={autoAdvance} />
            </div>
          ) : null}
        </div>

        <div className="pb-8 text-center">
          <p className="text-[18px] font-medium text-[#1f1f1f]">
            Hey Martin,
          </p>
          <h1 className="mt-1 text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#1f1f1f]">
            What can I help with?
          </h1>
        </div>
      </div>

      <div className="px-4 pb-6">
        <InputBar />
      </div>
    </div>
  );
}
