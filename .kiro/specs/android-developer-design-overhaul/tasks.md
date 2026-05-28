# Implementation Plan: Android Developer Design Overhaul

## Overview

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

The implementation language is **TypeScript** (Next.js 16 App Router, React 19, Tailwind v4) — already set by the existing codebase and design.md. All code uses `motion` v12, `gsap` 3.15, and `@paper-design/shaders-react` exactly as the design dictates; no new animation framework is introduced.

Foundations land first (motion engine, primitives, frames), then consumer sections (hero, tech grid, projects, device showcase, section rail, contact, experience, gallery, intro), then the page wiring + tokens, then performance, then property tests P1–P21, then example tests for EXAMPLE-classified requirements, then Lighthouse CI smoke tests.

Hard preservation contracts:

- `src/components/ui/iphone-frame.tsx` and its tests (`iphone-frame.test.tsx`, `iphone-frame.helpers.test.ts`) stay byte-identical. `AndroidPhoneFrame` and `PhoneFrame` ship as siblings.
- `src/components/portfolio/project-showcase.test.tsx` is **extended in place** to add Property 4 and Property 5 `fc.assert` blocks. It is never replaced.
- `src/lib/portfolio-data.ts` is changed by **additive optional fields only** (`device?`, `showcaseKickers?`).
- Existing `data-morph-target="hero-name"`, `intro-seen` localStorage key, and section ids `#home`, `#about`, `#components`, `#projects` are preserved.

## Tasks

- [x] 1. Foundation — Motion Engine + capability hooks
  - [x] 1.1 Create `Motion_Engine` module with shared spring + duration tables
    - Create `src/lib/motion-engine.ts` with `SHARED_SPRING = { type: "spring", stiffness: 280, damping: 30, mass: 0.9 }` (Req 1.2), `useSharedSpring()`, the `motionDurations` table (`counterMax = 1500`, `cardReveal`, `timelineRail = 1200`, `formField = 250`, `themeCrossfade = 250`, `containerTransform = 600`, `containerTransformAbort = 616`, `bootCap = 1800`, `reducedMotionHandoff = 200`, `staggerStepMin = 40`, `staggerStepMax = 160`, `techGridStepMin = 20`, `techGridStepMax = 80`), and the `motionVariants` constants (`containerTransform`, `sharedAxis`, `staggeredReveal(stepMs)`, `bottomSheet`).
    - Export the pure helper `staggerDelay(stepMs: number, childIndex: number): number` that returns `(stepMs * childIndex) / 1000` so Property 17 can target a numeric, deterministic function.
    - _Requirements: 1.2, 2.1, 3.4, 3.5, 4.6, 4.9, 5.2, 6.4, 7.1, 8.2, 9.3, 12.5, 13.2, 17.1_

  - [x] 1.2 Add `useReducedMotionState` and the `m()` / `gsapTimeline()` wrappers
    - In `src/lib/motion-engine.ts`, add `useReducedMotionState()` (subscribes to `window.matchMedia("(prefers-reduced-motion: reduce)")`, SSR-safe, updates within 100 ms of a system change), the `m<T>(tag)` wrapper that short-circuits to a static element under reduced motion, and the `gsapTimeline()` wrapper that returns a no-op timeline under reduced motion.
    - Add the test-only `__motionEngineSpy` exposing `motionAnimateCalls` and `gsapTimelineCalls` counters and `reset()`. Production builds export an empty no-op spy.
    - _Requirements: 1.2, 17.1, 17.2, 19.1_

  - [x] 1.3 Add `useEffectiveConnectionType` + `rippleDecayMs` helper
    - In `src/lib/motion-engine.ts`, add `useEffectiveConnectionType()` returning `"slow-2g" | "2g" | "3g" | "4g" | "unknown"` from `navigator.connection.effectiveType`, with safe SSR/browser fallback to `"4g"`/`"unknown"` and a `change`-event subscription.
    - Export the pure helper `rippleDecayMs(effectiveType): 600 | 800` (returns `800` for `"2g" | "3g"`, otherwise `600`) used by both the ripple primitive and Property 16.
    - _Requirements: 1.4, 16.6_

- [x] 2. Primitives — Ripple, focus-trap, Material Accent, Palette Swatcher
  - [x] 2.1 Implement Material ripple primitive + `usePressRipple` hook
    - Create `src/components/ui/ripple.tsx` exporting `<Ripple />` (positioned-absolute span tree) and `usePressRipple()` that attaches `pointerdown`/`keydown` (Enter/Space) handlers, computes origin `(x, y)` from the event relative to the bound element's `getBoundingClientRect()`, and decays via a `motion` opacity tween whose duration is `rippleDecayMs(useEffectiveConnectionType())`.
    - Read `--ripple-accent` at the moment of press so accent re-tinting is live (Req 11.3 → Req 1.4).
    - _Requirements: 1.4, 1.5, 8.5, 11.6, 18.4_

  - [x] 2.2 Implement `useFocusTrap` hook
    - Create `src/lib/use-focus-trap.ts` exporting `useFocusTrap(containerRef, { active, initialFocusSelector?, onEscape? })`. On activate it collects focusable descendants, moves focus to `initialFocusSelector` or the first focusable, redirects Tab at the last and Shift+Tab at the first, calls `onEscape` on Escape, and on deactivate restores focus to whatever was focused before activation.
    - _Requirements: 5.7, 14.6, 17.3, 19.6_

  - [x] 2.3 Define `AccentSeed` table + `resolveFocusRing` + WCAG contrast helper
    - Create `src/lib/theme/material-accent.ts` exporting `AccentSeedId`, `AccentSeed`, the `PALETTE_SEEDS` table (3–5 seeds: `android-green`, `compose-purple`, `material-blue`, `sunset-coral`, `mono-graphite`), the pure `wcagContrast(fgOklch, bgOklch): number` helper, and the pure `resolveFocusRing(seed, theme): { l, s, h }` that iterates lightness in 0.05 steps until the ring color hits the 3:1 WCAG threshold against the theme surface (hue and saturation preserved).
    - Export `THEME_TOKEN_PAIRS = { body: [...], large: [...] }` for Property 21.
    - _Requirements: 11.1, 11.5, 11.7, 12.4, 17.4, 19.9_

  - [x] 2.4 Implement `useMaterialAccent` provider + persistence
    - Create `src/lib/theme/use-material-accent.ts` exporting the hook + provider that reads `localStorage["material-accent-seed"]`, validates it against the seed table, applies `--accent-h`, `--accent-s`, `--accent-l`, `--accent-hex`, `--ring-accent`, `--ripple-accent`, `--halo-stop-1`, `--halo-stop-2` on `document.documentElement`, falls back to `android-green` when missing or invalid (Req 11.5), and listens to cross-tab `storage` events.
    - Wrap every `localStorage` access in `try/catch` so private mode does not crash the page.
    - _Requirements: 11.3, 11.4, 11.5, 12.5_

  - [x] 2.5 Build `PaletteSwatcher` component
    - Create `src/components/portfolio/palette-swatcher.tsx` exporting `PaletteSwatcher({ layout: "header" | "menu" })`. Each swatch is a circular `<button>` carrying an `aria-label` equal to the seed display name (Req 11.6), uses `aria-pressed="true"` on the active swatch and a checkmark glyph (no color-only state, Req 17.7), and renders a Material ripple via `usePressRipple` (Req 1.4 / 11.6).
    - Wire activation to `useMaterialAccent.setSeed`; transitions complete within 250 ms by virtue of `:root { transition: ... 250ms; }` declared in §14.
    - _Requirements: 1.4, 11.1, 11.2, 11.3, 11.6, 17.5, 17.7_

- [x] 3. Phone Frames — `AndroidPhoneFrame` + `PhoneFrame` dispatcher
  - [x] 3.1 Create `AndroidPhoneFrame` helpers
    - Create `src/components/ui/android-phone-frame.helpers.ts` mirroring the layout-math contract of `iphone-frame.helpers.ts` (status-bar top/height/font math, child padding so app content does not collide with chrome, `--device-screen-bg` resolution helpers).
    - Do not modify `iphone-frame.helpers.ts`.
    - _Requirements: 4.1, 4.4, 20.4_

  - [x] 3.2 Implement `AndroidPhoneFrame` component
    - Create `src/components/ui/android-phone-frame.tsx` exporting `<AndroidPhoneFrame />` plus the internal `AndroidStatusBar` (time on the left, signal/wifi/battery on the right, ~10 %-wide camera punch-hole disc top-center) and `AndroidGestureBar` (36 % width, 3 px tall, fully rounded). Renders `[data-device-screen]` with the same `--device-screen-bg` custom property and the same `device-screen-light` / `device-screen-dark` class hooks `IPhoneFrame` uses.
    - Do not modify `src/components/ui/iphone-frame.tsx`.
    - _Requirements: 1.1, 1.3, 4.1, 4.4_

  - [x] 3.3 Implement `PhoneFrame` variant dispatcher
    - Create `src/components/ui/phone-frame.tsx` exporting `DeviceVariant = "android" | "ios"` and `PhoneFrame({ variant, ...props })`: forwards to `<IPhoneFrame />` when `variant === "ios"` and to `<AndroidPhoneFrame />` when `variant === "android"`, narrowing variant-specific options at the call site.
    - _Requirements: 4.1, 4.4_

- [x] 4. Selectors and Active-Section Store
  - [x] 4.1 Implement `selectDeviceVariant`
    - Create `src/lib/device-variant.ts` exporting the pure `selectDeviceVariant(project)` per design §C.3 (returns declared `device` when present, defaults `lumen → "ios"`, otherwise `"android"`). No I/O — same input, same output.
    - _Requirements: 4.2, 4.3, 19.8_

  - [x] 4.2 Implement `ActiveSectionStore` + `useActiveSection`
    - Create `src/components/portfolio/active-section-store.ts` exporting `SECTION_IDS = ["home","components","projects","experience","contact"] as const`, `SectionId`, and `activeSectionStore` (`subscribe`, `getSnapshot`, `setActive`).
    - Create `src/lib/scroll/use-active-section.ts` exporting `useActiveSection(SECTION_IDS)` which subscribes to the store via `useSyncExternalStore` so `Section_Rail` and `Scroll_Island_Nav` see the same value on every render tick.
    - Export the pure helper `resolveActiveIndex(progress: number, count: number): number` (rounds + clamps) and `fillFromScrollProgress(progress: number): number` (clamps to `[0,1]`, including NaN/negative/>1 inputs) for Properties 13 and 20.
    - _Requirements: 9.1, 9.2, 9.4, 19.5, 20.4_

- [x] 5. Hero Section motion edits
  - [x] 5.1 Implement `AnimatedCounter`
    - Create `src/components/portfolio/animated-counter.tsx` exporting `<AnimatedCounter target suffix? durationMs?={1500} />`. Uses `motion`'s `useSpring`, after settle renders the bare `target` as plain text, and under reduced motion renders the target on first paint.
    - _Requirements: 2.5, 2.6, 19.2_

  - [x] 5.2 Implement `AvatarParallaxTilt`
    - Create `src/components/portfolio/avatar-parallax-tilt.tsx`. Wraps the existing `LiquidMetalAvatar`, applies `useMotionValue`-driven `rotateX` / `rotateY` capped at 8°, returns to neutral within 400 ms after `pointerleave`. Under reduced motion the wrapper short-circuits to a passthrough.
    - Export the pure helper `computeTilt(x: number, y: number): { rotateX: number; rotateY: number }` (input ∈ [0,1]², output bounded to ±8) for Property 18.
    - _Requirements: 2.4, 2.6_

  - [x] 5.3 Implement deferred-mount `MaterialHaloShader`
    - Create `src/components/portfolio/material-halo-shader.tsx`. Reads `--halo-stop-1` / `--halo-stop-2` from `getComputedStyle` on mount and on a `palette-changed` custom event. Does not mount the `@paper-design/shaders-react` scene until the avatar's `IntersectionObserver` reports it is within 200 vh of the viewport; until then renders a static CSS `radial-gradient` placeholder keyed off `--accent-halo`.
    - When `useEffectiveConnectionType()` ∈ `{"2g","slow-2g"}`, render only the static gradient and skip mounting the shader entirely.
    - _Requirements: 2.3, 16.4, 16.6_

  - [x] 5.4 Implement `HeroStaggerOrchestrator` and dispatch the palette-changed event
    - Create `src/components/portfolio/hero-stagger-orchestrator.tsx` wrapping the avatar / name / rotating role / meta columns / bio / DSA stats / social icons row in a `<motion.div variants={motionVariants.staggeredReveal(80)}>` with per-element delays in [40, 160] ms (Req 2.1).
    - Edit `src/components/portfolio/profile-section.tsx` to mount `<HeroStaggerOrchestrator>`, use `<AnimatedCounter target={500} suffix="+" />` in the DSA stats line, swap the avatar wrapper to `<AvatarParallaxTilt>`, and mount `<MaterialHaloShader>` behind it. Preserve the existing rotating-role typewriter cycle period in 2.0–4.0 s. Have `useMaterialAccent` dispatch `palette-changed` whenever a seed activates so the halo re-reads its stops.
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 6. Tech Stack — magnetic hover, tooltip, stagger
  - [x] 6.1 Implement magnetic offset helper + edit `tech-icon.tsx`
    - Edit `src/components/portfolio/tech-icon.tsx` to become a Client Component, wrap each icon in a `<motion.span>` driven by two `useMotionValue`s capped at 8 px each axis, with a `useSpring` return-to-origin within 400 ms on `pointerleave`. Open the tooltip on hover (≥200 ms hover delay), on focus, and on tap (coarse-pointer); position via `floating-ui` (already pulled transitively); render a visible focus ring via `var(--ring-accent)`.
    - Export a pure `computeMagneticOffset(pointer, bounds): { dx, dy }` helper (bounded to ±8, even when bounds collapse) used in this file and by Property 19.
    - Apply the `motionVariants.staggeredReveal` parent variant on the grid for first-viewport intersection (delays in [20, 80] ms). Under reduced motion, skip magnetic transform and stagger.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 17.5_

- [x] 7. Projects — Card tilt, ripple, layoutId, container-transform showcase
  - [x] 7.1 Extend the `Project` type with additive optional fields
    - Edit `src/lib/portfolio-data.ts` to add `device?: "android" | "ios"` and `showcaseKickers?: ReadonlyArray<{ screenId: string; kicker: string }>` to the `Project` type. Seed `chime` with `device: "android"` and `lumen` with `device: "ios"` plus their kickers. Existing fields and ordering are unchanged.
    - _Requirements: 4.2, 20.1, 20.2_

  - [x] 7.2 Edit `ProjectCard` for layoutId, tilt, ripple, activation parity
    - Edit `src/components/portfolio/project-card.tsx` (or the card-rendering portion of `projects-section.tsx`) so each card is a `<button type="button">` wrapping a `<motion.article layoutId={\`card-\${project.id}\`}>` and a shared `<motion.div layoutId={\`cover-\${project.id}\`}>` over the cover artwork, which is now rendered inside a `<PhoneFrame variant={selectDeviceVariant(project)}>`.
    - Apply 3D tilt capped at 6° per axis with cursor-following highlight on fine pointers, return to neutral within 400 ms on `pointerleave`, and render a "Tap to preview" affordance with animated trailing arrow on fine-pointer hover. Under coarse pointer, suppress the tilt entirely and render a press ripple via `usePressRipple` instead.
    - Wire keyboard activation parity: click, Enter, and Space all invoke the same `onOpen(project.id)` handler exactly once. Reveal-on-viewport completes within 600 ms via `motionVariants.staggeredReveal`.
    - Register the card element in a `Map<projectId, HTMLElement>` ref pool so `ProjectShowcase` can restore focus on close.
    - _Requirements: 1.4, 1.5, 4.1, 4.2, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 19.3_

  - [x] 7.3 Add `activeProjectId` state and transform lock to `ProjectsSection`
    - Edit `src/components/portfolio/projects-section.tsx` to own `activeProjectId` and `isAnimating` (transform lock). A second card activation while the transform is in progress is ignored. Pass the state into `<ProjectShowcase>` so the surface and the originating card share `layoutId`s.
    - _Requirements: 5.1, 5.5_

  - [x] 7.4 Wire `ProjectShowcase` open + abort/snap timer (≤616 ms)
    - Edit `src/components/portfolio/project-showcase.tsx`: replace the cross-fade with `motion.layoutId` against the originating card and the cover, set the `motionVariants.containerTransform` transition, install a `useEffect` that fires at `BUDGET_MS + ONE_FRAME = 616 ms` and flips `setOpenInstant(true)` (snaps to open) if `hasSettled.current` is still `false`, and have `onLayoutAnimationComplete` set `hasSettled.current = true`.
    - Reverse-transform on close only if `hasSettled.current === true`; otherwise unmount instantly. Under reduced motion both open and close are instant.
    - On open, focus moves to the close button after settle. Wire `useFocusTrap` to keep Tab/Shift+Tab cycling within the dialog. On close, restore focus to the originating `Project_Card` via the ref pool.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 19.4, 19.6_

  - [x] 7.5 Add bottom-sheet variant for `ProjectShowcase` under 768 px
    - Edit `src/components/portfolio/project-showcase.tsx` to mount as a `motion.aside` animating `y` from `100%` to `0%` instead of the layout-shared transform when `window.matchMedia("(max-width: 767px)")` matches. Use `motion`'s `drag="y"` with `dragConstraints={{ top: 0 }}`; on `pointerup` if `dy >= 80` call `onClose`, else spring back. Preserve the focus trap and focus restore.
    - _Requirements: 15.2_

- [x] 8. Checkpoint — Foundations + frames + projects
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Device Showcase
  - [x] 9.1 Build `Device_Showcase` scroll-driven stage (≥768 px)
    - Create `src/components/portfolio/device-showcase.tsx` mounting a 200 vh `<section data-device-showcase>` between hero and projects with a sticky inner stage that pins the `<PhoneFrame>` at viewport center. Use `useScroll({ target, offset: ["start end","end start"] })` and `useTransform(progress, [...], [...])` to drive `screenIndex`, `projectIndex` (variant flip), and per-screen kicker opacity. Apply `motionVariants.sharedAxis` for screen transitions (≤500 ms) and a cross-fade on the `Phone_Frame` variant flip (≤600 ms) inside a fixed-aspect outer wrapper so neither variant changes the parent layout.
    - Make the pinned frame a `<button>` so click/tap opens the corresponding `Project_Showcase` (Req 3.6).
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 19.5_

  - [x] 9.2 Mobile carousel fallback (<768 px)
    - In the same component, replace the scroll-pin with a horizontally scrolling `<ul>` whose children use `scroll-snap-type: x mandatory` and `scroll-snap-align: center`, plus pagination dots that call `el.scrollIntoView`. Native momentum + snap satisfies both touch swipe and tap-to-paginate.
    - _Requirements: 3.7, 15.3_

  - [x] 9.3 Reduced-motion + slow-connection static fallbacks
    - In the same component, branch on `useReducedMotionState()` to render one `<PhoneFrame>` per project side by side with the project's first screen and a small native pagination control; do not subscribe to `useScroll`. Branch on `useEffectiveConnectionType()` ∈ `{"2g","slow-2g"}` to render the same static layout and skip every shader.
    - _Requirements: 3.8, 16.6_

  - [x] 9.4 Lazy-load showcase artwork
    - Gate every screen image beyond `screens[0]` per project on an `IntersectionObserver` that fires when the `<section data-device-showcase>` is within 200 vh of the viewport. First-screen images are eager so the section never shows an empty frame.
    - Add the new screen artwork under `public/images/projects/lumen/{home-001.webp, results-001.webp, moodboard-001.webp}` and `public/images/projects/chime/{inbox-001.webp, chat-001.webp, compose-001.webp}` (placeholder files acceptable until real art lands), each rendered via `next/image` with `srcSet` for `360w/720w/1080w` and the `sizes` rule from §Performance.
    - _Requirements: 3.9, 16.4, 16.5, 16.7_

- [x] 10. Section Rail + Scroll Island Nav synchronization
  - [x] 10.1 Implement `Section_Rail`
    - Create `src/components/portfolio/section-rail.tsx`. Pin the rail to the right edge ≥1024 px and to the left edge at 640–1023 px; hide it under 640 px. The 2 px track holds a `<motion.div>` filled track whose `scaleY` is bound to `useScroll().scrollYProgress`. An `IntersectionObserver` on each `SECTION_IDS` element with `rootMargin: "-40% 0px -55% 0px"` writes the active id to `activeSectionStore`. The highlighted segment is a `<motion.div>` whose `top` and `height` track the active section's bounding rect with a 300 ms spring transition, and whose width thickens (not just color) to satisfy Req 17.7.
    - Under reduced motion, update fill and segment instantly without easing.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 17.7_

  - [x] 10.2 Subscribe `Scroll_Island_Nav` to the shared store
    - Edit `src/components/portfolio/scroll-island-nav.tsx` to read the active section through `useActiveSection(SECTION_IDS)` (replacing any local IntersectionObserver duel), keep it pinned ≥480 px, update the scroll-progress percentage with ≤100 ms perceived lag, and animate the index dropdown expansion with `motionVariants.sharedAxis`-equivalent spring within 400 ms.
    - On section selection: smooth-scroll with `scroll-margin-top` accounting for the nav's pinned height; on keyboard activation, move focus to the destination's primary heading after the scroll settles. Use `useFocusTrap` on the dropdown so the trap holds open AND while it is closing, releasing only when fully closed. Under reduced motion, skip the spring and use instant scrolling.
    - Render the `<PaletteSwatcher layout="menu">` inside the dropdown for viewports under 768 px (Req 11.2).
    - _Requirements: 9.4, 11.2, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 17.7, 19.5_

- [x] 11. Contact Section motion + form feedback
  - [x] 11.1 Floating labels, validation focus, ripples on quick actions
    - Edit `src/components/portfolio/contact-section.tsx` (becomes a Client Component): stagger the "Get in Touch" card and the "Send a Message" form on viewport entry with ≤120 ms gap; animate field border + label position within 250 ms in a Material floating-label transition; show the inline progress indicator within 100 ms of submit and skip it entirely if the submission resolves first; on validation failure, render `aria-invalid="true"` plus a textual message adjacent to the offending field and move focus to the first invalid field; render a `usePressRipple()`-driven ripple on every quick-action link and the submit CTA. Network failure shows the documented inline error with the email link as fallback CTA. Under reduced motion, skip reveal + focus animations but keep focus rings and validation feedback intact.
    - _Requirements: 1.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 17.7_

- [x] 12. Experience Timeline reveal + rail-grow
  - [x] 12.1 Animate timeline rail growth + per-entry slide reveal
    - Edit `src/components/portfolio/experience-section.tsx` to animate the vertical rail from top to bottom completing within 1200 ms on viewport entry, reveal each entry's content with horizontal slide ≤24 px and opacity within 500 ms when the entry's node enters the viewport, elevate hovered entries with a subtle shadow and translation ≤4 px, and preserve the existing data shape and ordering from `portfolio-data.ts`. Under reduced motion, render the rail and entries in their final visual state without growth or slide.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 13. Component Gallery — Material 3 Expressive primitives
  - [x] 13.1 Build the M3 primitives + mount the gallery
    - Create `src/components/portfolio/component-gallery.tsx` exporting `<ComponentGallery>` which mounts as a sibling of the existing Tech Stack at `#components` (Tech Stack remains visible). Implement `M3FAB`, `M3Switch`, `M3Chip`, `M3RippleButton`, and `M3Snackbar` as small Client Components sharing `usePressRipple()` so ripple color follows `--ripple-accent`. State changes work even under reduced motion; only the motion is removed.
    - When the gallery would mount with zero primitives available, return `null` so the section is hidden rather than rendering an empty container. Preserve the existing `scroll-mt-32` (or equivalent) on `#components`.
    - _Requirements: 1.4, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 20.4_

- [x] 14. Intro Overlay — Android boot flavor + active suppression
  - [x] 14.1 Implement `AndroidBootOverlay` child + 1800 ms cap
    - Create `src/components/portfolio/android-boot-overlay.tsx`. Renders an opaque black backdrop, animates Android 16-style status-bar tokens in (time fades in, signal/wifi/battery slide in from the right with 60 ms stagger), reveals a centered `DHEERAJ` logo in `Roboto`/`Google Sans Display` (fallback Geist Sans), and dissolves at ~1500 ms. A `setTimeout(completeBoot, 1800)` enforces the hard cap (Req 13.2). The overlay tree contains only `motion`-free DOM so GSAP can own the FLIP morph without conflict.
    - _Requirements: 13.2_

  - [x] 14.2 Mount `AndroidBootOverlay` inside `IntroOverlay` and own `data-intro-active`
    - Edit `src/components/portfolio/intro-overlay.tsx` to mount `<AndroidBootOverlay>` before the existing `ScrollTextMotion` and the existing `runOutro()` FLIP morph onto `[data-morph-target="hero-name"]`. Preserve the Esc/Enter skip behavior and the `intro-seen` localStorage key. Set `document.documentElement.dataset.introActive = "boot"` on mount, transition to `"intro"` for the scroll segment, and only flip to `"done"` after the overlay node is fully unmounted from the DOM.
    - Add the reduced-motion fast-handoff effect that, when `useReducedMotionState()` is true, sets `data-intro-active="done"`, persists `intro-seen=1` in `try/catch`, and calls `onDone()` within 200 ms.
    - _Requirements: 13.1, 13.3, 13.4, 13.5, 13.6, 20.3_

  - [x] 14.3 Suppress portfolio animations while overlay is mounted or unmounting
    - Edit `src/app/globals.css` to add `:where(html[data-intro-active]:not([data-intro-active="done"])) main *, :where(html[data-intro-active]:not([data-intro-active="done"])) main *::before, :where(html[data-intro-active]:not([data-intro-active="done"])) main *::after { animation-play-state: paused !important; transition: none !important; }` so portfolio animations are actively paused (not merely flagged) until the overlay fully unmounts.
    - _Requirements: 13.6_

- [x] 15. Typography + spacing tokens + dark theme + theme crossfade
  - [x] 15.1 Add accent CSS variables, typography scale, spacing rhythm, and theme crossfade
    - Edit `src/app/globals.css` to add the `:root` accent variable block (`--accent-h`, `--accent-s`, `--accent-l`, `--accent-hex`, `--ring-accent`, `--ripple-accent`, `--halo-stop-1`, `--halo-stop-2`) plus a `:root { transition: <accent vars> 250ms; }` rule (Req 11.3 / 12.5).
    - Add the typography scale with the hero display ≥1.6× the next largest heading; section labels in a monospaced font with `letter-spacing` between 0.12em and 0.20em uppercased; vertical-rhythm spacing where the gap between primary sections is ≥1.5× the gap between adjacent direct children of the same section; body `max-width: 72ch` at viewports ≥1024 px; body `line-height: 1.65` at ≥640 px.
    - Define the dark elevation ladder so adjacent stacked surfaces differ in lightness by ≥2 L\* units, light-theme surfaces stay near white (≥80 % within L\* ∈ [92, 100]), and add the `.focus-ring` utility (`outline: 2px solid var(--ring-accent); outline-offset: 2px`) applied via `:focus-visible`. Add `min-h-11 min-w-11` enforcement under 768 px.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.3, 12.1, 12.2, 12.3, 12.4, 12.5, 15.4, 17.4_

  - [x] 15.2 Wire `PaletteSwatcher` into `SiteHeader` ≥768 px
    - Edit `src/components/portfolio/site-header.tsx` to render `<PaletteSwatcher layout="header">` on viewports ≥768 px. Preserve the existing theme toggle entry point and persistence (Req 12.3).
    - _Requirements: 11.2, 12.3_

  - [x] 15.3 Wire the page tree
    - Edit `src/app/page.tsx` to mount `<DeviceShowcase />` between hero and projects, `<SectionRail />` once at the page root, and `<ComponentGallery />` alongside the existing Tech Stack at `#components`. Preserve all existing section ids (`#home`, `#about`, `#components`, `#projects`).
    - _Requirements: 3.1, 9.1, 18.1, 18.2, 20.4_

- [x] 16. Performance — code-splitting, image variants, slow-connection branches, layout-shift prevention
  - [x] 16.1 Code-split heavy clients via `next/dynamic`
    - Edit `src/app/page.tsx` (and `src/components/portfolio/projects-section.tsx` where appropriate) to load `DeviceShowcase`, `ComponentGallery`, and `ProjectShowcase` through `next/dynamic({ ssr: false })`. Lazy-import each M3 primitive inside `ComponentGallery` so the initial payload only carries above-the-fold code. Confirm `gsap` is only pulled into the `intro-*` chunk.
    - _Requirements: 16.1, 16.3_

  - [x] 16.2 Layout-shift prevention on `PhoneFrame` and showcase
    - Edit `src/components/ui/phone-frame.tsx` and `src/components/portfolio/device-showcase.tsx` so every `PhoneFrame` declares a fixed `aspect-ratio` via inline style, and the showcase outer wrapper reserves `min-height` equal to the scroll-region height. The variant cross-fade lives inside a fixed-aspect outer wrapper sized to the larger of `android` (0.45) and `ios` (0.477) so neither variant changes the parent layout.
    - _Requirements: 12.5, 16.2_

- [ ] 17. Property-Based Tests — P1 through P21
  - [-] 17.1 Property 1 — reduced motion suppresses every section's timelines
    - File: `src/components/portfolio/a11y.test.tsx` (new). `fc.assert` over `fc.constantFrom(...SECTIONS)` with `matchMedia('reduce')` shimmed; render each section and assert `__motionEngineSpy.motionAnimateCalls === 0` AND `__motionEngineSpy.gsapTimelineCalls === 0`.
    - **Property 1: Reduced-motion universally suppresses timelines**
    - **Validates: Requirements 2.6, 3.8, 5.6, 6.6, 7.5, 8.6, 9.5, 13.5, 14.7, 17.2, 18.5, 19.1**

  - [-] 17.2 Property 2 — `Animated_Counter` convergence
    - File: `src/components/portfolio/profile-section.test.tsx` (new). Generator: `fc.integer({ min: 0, max: 1_000_000 })`; under fake timers, render `<AnimatedCounter target={T}/>`, advance 1500 ms, assert text content equals `String(T)`.
    - **Property 2: Animated_Counter convergence**
    - **Validates: Requirements 2.5, 19.2**

  - [-] 17.3 Property 3 — `Project_Card` activation parity
    - File: `src/components/portfolio/projects-section.test.tsx` (new). Generators: `fc.constantFrom(...projects)` × `fc.constantFrom("click","Enter","Space")`; assert each activation calls `onOpen` exactly once with `p.id`.
    - **Property 3: Project_Card activation parity**
    - **Validates: Requirements 5.1, 19.3**

  - [~] 17.4 Property 4 — Container_Transform identity + focus management (extend in place)
    - File: `src/components/portfolio/project-showcase.test.tsx` (**existing — extended, not replaced**). Add an `fc.assert` block over `fc.constantFrom(...projects)` asserting (a) shared `motion.layoutId` derived from `p.id`, (b) initial focus on the close control, (c) Tab/Shift+Tab cycle returns within one full pass, (d) close restores focus to the originating card.
    - **Property 4: Container_Transform identity and focus management**
    - **Validates: Requirements 5.4, 5.7, 19.4, 19.6**

  - [~] 17.5 Property 5 — Container_Transform timing ceiling (extend in place)
    - File: `src/components/portfolio/project-showcase.test.tsx` (**existing — extended, not replaced**). Add an `fc.assert` block over `fc.constantFrom(...projects)` that runs the open animation under fake timers, never fires `onLayoutAnimationComplete`, advances 616 ms, and asserts the showcase has reached its open visual state via the abort/snap path.
    - **Property 5: Container_Transform timing ceiling**
    - **Validates: Requirements 5.2**

  - [-] 17.6 Property 6 — `selectDeviceVariant` total purity
    - File: `src/components/ui/__tests__/device-variant-selector.test.ts` (new). Generator: `fc.record({ id: fc.string(), device: fc.option(fc.constantFrom("android","ios")) })`; assert return ∈ `{"android","ios"}`, repeated calls match, and `device === undefined` always returns `"android"`.
    - **Property 6: deviceVariantSelector total purity**
    - **Validates: Requirements 4.3, 19.8**

  - [~] 17.7 Property 7 — Accessible name on icon-only controls
    - File: `src/components/portfolio/a11y.test.tsx` (new, shared with P1/P12). Generators: `fc.constantFrom(...projects)` ∪ `fc.constantFrom(...techStack)` ∪ palette/social/island controls; assert `getByRole(role, { name: predicate })` resolves a non-empty name.
    - **Property 7: Accessible name on icon-only controls**
    - **Validates: Requirements 17.5, 19.7**

  - [-] 17.8 Property 8 — Focus-ring contrast across seed × theme
    - File: `src/lib/theme/__tests__/material-accent.test.ts` (new). Generators: `fc.constantFrom(...PALETTE_SEEDS)` × `fc.constantFrom("light","dark")`; assert `wcagContrast(resolveFocusRing(seed, theme), surfaceTokenFor(theme)) >= 3`.
    - **Property 8: Focus-ring contrast across seed × theme**
    - **Validates: Requirements 11.7, 17.4, 19.9**

  - [-] 17.9 Property 9 — `Section_Rail` and `Scroll_Island_Nav` agreement
    - File: `src/components/portfolio/section-rail.test.tsx` (new). Generator: `fc.float({ min: 0, max: 1 })` (synthetic scrollY → IntersectionObserver entries); render rail + island; assert rail `aria-current` segment id === island reported active id === `useActiveSection(SECTION_IDS)` for every tick.
    - **Property 9: Section_Rail and Scroll_Island_Nav agreement**
    - **Validates: Requirements 9.4, 19.5**

  - [-] 17.10 Property 10 — Ripple bounded settle from press coordinates
    - File: `src/components/ui/__tests__/ripple.test.tsx` (new). Generators: `fc.tuple(surfaceKind, fc.float({ min: 0, max: 1 }), fc.float({ min: 0, max: 1 }), effectiveType)`; under fake timers, fire pointerdown at `(x, y)` inside the surface bounds, assert ripple origin equals press coords (within tolerance) and final opacity is zero by 600 ms (4g/unknown) or 800 ms (2g/3g/slow-2g).
    - **Property 10: Ripple bounded settle from press coordinates**
    - **Validates: Requirements 1.4, 8.5, 11.6, 18.4**

  - [~] 17.11 Property 11 — Backwards-compatible optional project fields
    - File: `src/components/portfolio/projects-section.test.tsx` (new, shared with P3). Generator: `fc.record({ id, title, ... }, { withDeletedKeys: true })`; assert `<ProjectCard p>` and inclusion in `<DeviceShowcase>` succeed without runtime error and the card falls back to the `"android"` variant when `device` is absent. Projects with no showcase screens are gracefully omitted from the showcase.
    - **Property 11: Backwards-compatible optional project fields**
    - **Validates: Requirements 20.2**

  - [~] 17.12 Property 12 — Coarse-pointer substitutes hover with press feedback
    - File: `src/components/portfolio/a11y.test.tsx` (new, shared with P1/P7). Generator: `fc.constantFrom(card, techIcon, heroCTA)` × `matchMedia("(pointer: coarse)")` shim; assert tap reveals tooltip / hover-only critical content AND `Project_Card` has no `rotateX`/`rotateY` transforms AND tech icon has no magnetic translation.
    - **Property 12: Coarse-pointer substitutes hover with press feedback**
    - **Validates: Requirements 1.5, 4.8, 6.5, 15.5**

  - [-] 17.13 Property 13 — Showcase scroll-progress monotonicity
    - File: `src/components/portfolio/device-showcase.test.tsx` (new). Generator: `fc.tuple(fc.float({ min: 0, max: 1 }), fc.float({ min: 0, max: 1 }))` filtered to `p1 ≤ p2`; assert `resolveActiveIndex(p1) ≤ resolveActiveIndex(p2)` AND `resolveActiveIndex(0) === 0` AND `resolveActiveIndex(1) === N-1`.
    - **Property 13: Showcase scroll-progress monotonicity**
    - **Validates: Requirements 3.2**

  - [~] 17.14 Property 14 — Slow-connection static fallback
    - File: `src/components/portfolio/device-showcase.test.tsx` (new, shared with P13). Generator: `fc.constantFrom("2g","slow-2g")` shim of `navigator.connection.effectiveType`; assert no `<canvas>`/shader element renders, no `useScroll` subscription is established (spy on `motion`'s `useScroll`), and the static-fallback frames are present.
    - **Property 14: Slow-connection static fallback**
    - **Validates: Requirements 16.6**

  - [-] 17.15 Property 15 — `Material_Accent` persistence round-trip
    - File: `src/lib/theme/__tests__/use-material-accent.test.ts` (new). Generator: `fc.constantFrom(...PALETTE_SEEDS)`; call `setSeed(s)`, unmount, clear in-memory state, re-mount the hook, assert restored seed === `s` AND `document.documentElement.style` carries the canonical `--accent-h` for `s`.
    - **Property 15: Material_Accent persistence round-trip**
    - **Validates: Requirements 11.3, 11.4**

  - [~] 17.16 Property 16 — `rippleDecayMs` is a step function of connection type
    - File: `src/components/ui/__tests__/ripple.test.tsx` (existing from P10, extended). Generator: `fc.constantFrom("slow-2g","2g","3g","4g")`; assert `rippleDecayMs(t) === 800` for `"2g"|"3g"` and `=== 600` otherwise.
    - **Property 16: Ripple decay duration is a step function of connection type**
    - **Validates: Requirements 1.4**

  - [-] 17.17 Property 17 — Staggered-reveal delays are linear in child index
    - File: `src/lib/motion/__tests__/spring-presets.test.ts` (new). Generators: `fc.integer({ min: 40, max: 160 })` × `fc.integer({ min: 0, max: 7 })`; assert `staggerDelay(stepMs, childIndex)` equals `(stepMs * childIndex) / 1000` and is finite.
    - **Property 17: Staggered-reveal delays are linear in child index**
    - **Validates: Requirements 2.1, 6.4**

  - [~] 17.18 Property 18 — Avatar tilt is bounded by ±8 degrees
    - File: `src/components/portfolio/profile-section.test.tsx` (existing from P2, extended). Generators: `fc.float({ min: 0, max: 1 })` × `fc.float({ min: 0, max: 1 })`; assert `computeTilt(x, y)` returns `(rotateX, rotateY)` such that `|rotateX| ≤ 8` and `|rotateY| ≤ 8`.
    - **Property 18: Avatar tilt is bounded by ±8 degrees**
    - **Validates: Requirements 2.4**

  - [ ] 17.19 Property 19 — Magnetic-hover offset is bounded by 8 px
    - File: `src/components/portfolio/__tests__/tech-icon.test.tsx` (new). Generators: arbitrary pointer position × element bounds with `width > 0` and `height > 0`; assert `computeMagneticOffset(pointer, bounds)` returns `(dx, dy)` such that `|dx| ≤ 8` and `|dy| ≤ 8`.
    - **Property 19: Magnetic-hover offset is bounded by 8 pixels**
    - **Validates: Requirements 6.1**

  - [~] 17.20 Property 20 — Section rail fill is a clamp of scroll progress
    - File: `src/components/portfolio/section-rail.test.tsx` (existing from P9, extended). Generator: arbitrary numeric `progress` (including NaN, negatives, and values >1); assert `fillFromScrollProgress(progress)` returns `f` with `0 ≤ f ≤ 1`, and `f === progress` when `0 ≤ progress ≤ 1`.
    - **Property 20: Section rail fill is a clamp of scroll progress**
    - **Validates: Requirements 9.2**

  - [~] 17.21 Property 21 — Body and large-text design tokens satisfy WCAG contrast
    - File: `src/lib/theme/__tests__/material-accent.test.ts` (existing from P8, extended). Generators: `fc.constantFrom(...THEME_TOKEN_PAIRS.body)` (resp. `.large`) × `fc.constantFrom("light","dark")`; assert `wcagContrast(fg, bg) ≥ 4.5` for body and `≥ 3.0` for large.
    - **Property 21: Body and large-text design tokens satisfy WCAG contrast**
    - **Validates: Requirements 12.4**

- [ ] 18. Example tests for EXAMPLE-classified requirements
  - [~] 18.1 Intro overlay example tests
    - File: `src/components/portfolio/intro-overlay.test.tsx` (new). Cover Req 13.2 (1800 ms cap cuts boot when timeline overruns), Req 13.3 (Esc/Enter skip lands on FLIP outro), Req 13.4 (`intro-seen=1` skips overlay on second load), Req 13.6 (`data-intro-active` set on mount, only flips to `"done"` after full unmount).
    - _Requirements: 13.2, 13.3, 13.4, 13.6_

  - [~] 18.2 PaletteSwatcher example tests
    - File: `src/components/portfolio/palette-swatcher.test.tsx` (new). Cover Req 11.1 (palette holds 3–5 seeds) and Req 11.2 (placement: `SiteHeader` ≥768 px, `ScrollIslandNav` action menu <768 px).
    - _Requirements: 11.1, 11.2_

  - [~] 18.3 Experience timeline example tests
    - File: `src/components/portfolio/experience-section.test.tsx` (new). Cover Req 7.1 (rail growth ≤1200 ms) and Req 7.2 (entry slide ≤24 px + opacity ≤500 ms).
    - _Requirements: 7.1, 7.2_

  - [~] 18.4 Contact section example tests
    - File: `src/components/portfolio/contact-section.test.tsx` (new). Cover Req 8.1 (parallel reveal stagger ≤120 ms), Req 8.2 (focus floating-label transition ≤250 ms), Req 8.3 (inline progress within 100 ms; skipped when submission resolves first).
    - _Requirements: 8.1, 8.2, 8.3_

  - [~] 18.5 Component gallery example tests
    - File: `src/components/portfolio/component-gallery.test.tsx` (new). Cover Req 18.1 (≥4 primitives mounted from the FAB/switch/chip/ripple/snackbar set), Req 18.2 (`#components` anchor preserved with same scroll-margin), Req 18.3 (Tech Stack stays visible).
    - _Requirements: 18.1, 18.2, 18.3_

  - [~] 18.6 Device showcase example tests
    - File: `src/components/portfolio/device-showcase.test.tsx` (existing from P13/P14, extended). Cover Req 3.1 (rendered between hero and projects with Chime + Lumen present), Req 3.4 (screen transition ≤500 ms), Req 3.5 (variant flip ≤600 ms), Req 3.7 (mobile carousel responds to swipe with snap + dots).
    - _Requirements: 3.1, 3.4, 3.5, 3.7_

  - [~] 18.7 Phone frame variant example tests
    - File: `src/components/ui/__tests__/phone-frame.test.tsx` (new) plus `src/components/ui/__tests__/android-phone-frame.test.tsx` (new). Cover Req 4.1 (cover artwork rendered inside `PhoneFrame`) and Req 4.4 (Android variant renders the Android 16 status-bar tokens; iOS variant unchanged).
    - _Requirements: 4.1, 4.4_

  - [~] 18.8 Responsive + touch-target example tests
    - File: `src/components/portfolio/responsive.test.tsx` (new). Cover Req 9.6 (`Section_Rail` hidden <640 px), Req 14.1 (`Scroll_Island_Nav` pinned ≥480 px), Req 15.1 (single-column layout <640 px with no horizontal overflow), Req 15.6 (Hero + first project frame fit in 390×844 without horizontal scroll or text clipping).
    - _Requirements: 9.6, 14.1, 15.1, 15.6_

- [ ] 19. Lighthouse CI smoke tests
  - [~] 19.1 Lighthouse mobile budget (LCP / CLS / INP) + theme-crossfade CLS
    - File: `lighthouserc.cjs` (new) + `.github/workflows/lighthouse.yml` (new) (or equivalent for the project's CI). Configure a Lighthouse CI run on a Moto G Power class mobile profile that fails the build if LCP > 2.5 s (Req 16.1), CLS > 0.10 (Req 16.2), INP > 200 ms on opening a `Project_Showcase`, opening the `Scroll_Island_Nav` index, focusing a contact form input, or activating a `Palette_Swatcher` swatch (Req 16.3), or any layout shift is observed during the 250 ms theme crossfade (Req 12.5).
    - _Requirements: 12.5, 16.1, 16.2, 16.3_

- [~] 20. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP. Property tests (17.x), example tests (18.x), and Lighthouse smoke tests (19.x) are all optional sub-tasks under non-optional parent tasks.
- Each task references specific requirement IDs and, where applicable, property IDs (P1–P21) for traceability.
- Foundations (1.x) precede primitives (2.x), which precede frames (3.x), selectors (4.x), and consumer sections (5.x–14.x). Page wiring + tokens (15.x) and performance (16.x) follow once the consumers exist. Tests (17.x–19.x) follow the implementation they target.
- Two preservation contracts are upheld throughout: `iphone-frame.tsx` and its tests stay byte-identical, and `project-showcase.test.tsx` is extended in place (Properties 4 and 5).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "3.1", "4.1", "4.2", "7.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "3.2"] },
    { "id": 2, "tasks": ["2.4", "2.5", "3.3", "5.1", "5.2", "5.3"] },
    { "id": 3, "tasks": ["5.4", "6.1", "7.2", "9.1", "10.1", "11.1", "12.1", "13.1", "14.1", "15.1"] },
    { "id": 4, "tasks": ["7.3", "9.2", "9.3", "9.4", "10.2", "14.2", "15.2"] },
    { "id": 5, "tasks": ["7.4", "14.3", "15.3"] },
    { "id": 6, "tasks": ["7.5", "16.1", "16.2"] },
    { "id": 7, "tasks": ["17.1", "17.2", "17.3", "17.6", "17.7", "17.8", "17.9", "17.10", "17.11", "17.12", "17.13", "17.14", "17.15", "17.16", "17.17", "17.19", "17.20", "17.21"] },
    { "id": 8, "tasks": ["17.4", "17.5", "17.18", "18.1", "18.2", "18.3", "18.4", "18.5", "18.6", "18.7", "18.8"] },
    { "id": 9, "tasks": ["19.1"] }
  ]
}
```
