# Design Document

## Overview

This design turns the existing portfolio (Next.js 16 App Router, React 19,
Tailwind v4, `motion` v12, `gsap` 3.15, `@paper-design/shaders-react`) into
a portfolio that visibly reads as the work of an Android / mobile developer
without swapping any framework or breaking the data shape declared in
`src/lib/portfolio-data.ts`.

The work is organized around six new pieces and a handful of edits:

- **`Motion_Engine`** — a single client module that owns `Reduced_Motion_State`,
  the shared spring preset, container-transform variants, and the `motion`/`gsap`
  wrappers that every animated component in the redesign will use.
  (Requirements 1.2, 17.1, 17.2, 19.1.)
- **`Phone_Frame` variants** — the existing `IPhoneFrame` is retained
  unchanged and joined by a new sibling `AndroidPhoneFrame`. A pure
  `Device_Variant_Selector` decides which one to render per project.
  (Requirements 4.1–4.4, 19.8.)
- **`Device_Showcase`** — a new scroll-driven section between the hero and
  projects that scrubs through real Chime + Lumen screens, with a swipe
  carousel fallback under 768 px and a static fallback under reduced motion
  or `2g`. (Requirements 3.1–3.9, 15.3, 16.5, 16.6.)
- **Container-transform `Project_Card → Project_Showcase`** — opens
  via `motion`'s shared `layoutId` instead of cross-fade, with a 600 ms
  budget, an abort-and-snap path, and proper focus management.
  (Requirements 5.1–5.7, 19.4.)
- **`Palette_Swatcher` / `Material_Accent`** — three to five Material You
  seeds applied via CSS custom properties on `:root`, persisted in
  `localStorage`, with a contrast guard for focus rings.
  (Requirements 11.1–11.7, 19.9.)
- **`Section_Rail`** — a single fixed rail synchronised with
  `Scroll_Island_Nav` so both report the same active section.
  (Requirements 9.1–9.6, 19.5.)
- **`Component_Gallery`** — a Material 3 Expressive primitives section
  mounted alongside the existing Tech Stack at the `#components` anchor.
  (Requirements 18.1–18.5.)

The hero, projects grid, experience timeline, contact section, intro overlay,
and scroll island are edited in place. No file in the existing app is
deleted; the existing `iphone-frame.tsx` ships unchanged so its current test
suite (`iphone-frame.test.tsx`, `iphone-frame.helpers.test.ts`,
`project-showcase.test.tsx`) keeps passing.

The single coherent motion language is the spring `{ stiffness: 280,
damping: 30, mass: 0.9 }` already used by `ProjectShowcase.MOTION`. That
preset is hoisted out of the showcase into `motion-engine.ts` so every
animated surface in the redesign consumes the same value
(Requirement 1.2).

## Architecture

### Page-level architecture (RSC vs Client split)

```
src/app/page.tsx                  [Server Component, unchanged shape]
└── <IntroGate>                   [Client — gates intro, persists `intro-seen`]
    └── <main>
        ├── <SiteHeader/>         [Client — adds <PaletteSwatcher/> on ≥768px]
        ├── <ScrollIslandNav/>    [Client — listens to ActiveSectionStore]
        ├── <SectionRail/>        [Client — new, hidden <640px]
        └── <div max-w-5xl ...>
            ├── <ProfileSection/> [Server shell, with Client children:
            │                      LiquidMetalAvatar, AnimatedCounter,
            │                      MaterialHaloShader, GitHubContributions]
            ├── <DeviceShowcase/> [Client — new, scroll-driven]
            ├── <ProjectsSection/> [Client — owns activeId state +
            │                       container-transform layoutId]
            ├── <ComponentGallery/> [Client — new, Material 3 primitives]
            ├── <ExperienceSection/> [Server shell, with Client Reveals
            │                         and Client TimelineRail]
            ├── <ContactSection/> [Client — was Server, now Client because
            │                      of the form's progress state +
            │                      floating labels]
            └── <SiteFooter/>     [Server, unchanged]
```

```
                                         ┌──────────────────────┐
                                         │   Motion_Engine      │
                                         │  (client module,     │
                                         │   single instance)   │
                                         │                      │
                                         │ • useReducedMotionState
                                         │ • SHARED_SPRING      │
                                         │ • motionVariants     │
                                         │ • useMotionGate(spy) │
                                         │ • gsapWrap(spy)      │
                                         └──────────────────────┘
                                                    ▲
                ┌────────────────┬──────────────────┼──────────────────┬────────────────────┐
                │                │                  │                  │                    │
        DeviceShowcase    ProjectsSection      ProjectShowcase    SectionRail         IntroOverlay
        (scroll-driven)   (cards + tilt)       (container-       (scroll fill +     (Android boot
                          (layoutId source)     transform)        active section)     overlay)
                                                                          ▲
                                                                          │
                                                                ScrollIslandNav
                                                                (subscribes to
                                                                ActiveSectionStore)
```

The central design decision is that **every** animation in the redesign
goes through `Motion_Engine`. The engine is the only place that:

1. Reads `prefers-reduced-motion` (Requirement 17.1, 19.1).
2. Reads `navigator.connection.effectiveType` once at mount and re-reads
   on `change` (Requirement 16.6).
3. Owns the shared spring preset (Requirement 1.2).
4. Exposes the `__motionEngineSpy` test hook used by the property test
   for Requirement 19.1.

Everything else either calls a hook on the engine (`useReducedMotionState`,
`useSharedSpring`) or pulls a variant constant (`motionVariants.containerTransform`).
This is what makes Requirement 19.1's "no `motion` or `gsap` timelines under
reduced motion" property testable: a single spy module can prove it for
every section.

### State ownership

| State                                | Owner                                | Consumers                                   | Persistence       |
|--------------------------------------|--------------------------------------|---------------------------------------------|-------------------|
| `Reduced_Motion_State`               | `motion-engine.ts` module store      | every animated component                    | none              |
| `connection.effectiveType` snapshot  | `motion-engine.ts` module store      | `DeviceShowcase`, hero halo                 | none              |
| `Material_Accent` seed               | `palette-swatcher.tsx` provider      | `:root` CSS vars (focus, ripple, halo)      | `localStorage`    |
| `Theme` (light/dark)                 | existing `ThemeToggle` (unchanged)   | unchanged                                   | `localStorage`    |
| `activeProjectId` (for transform)    | `ProjectsSection`                    | `ProjectCard`, `ProjectShowcase`            | none              |
| `activeSectionId`                    | `ActiveSectionStore` (`section-rail.tsx`) | `SectionRail`, `ScrollIslandNav`         | none              |
| `introSeen`                          | existing `IntroGate`/`IntroOverlay`  | unchanged (preserved key `intro-seen`)      | `localStorage`    |
| Showcase `screenIndex` (existing)    | `ProjectShowcase`                    | unchanged                                   | none              |

`ActiveSectionStore` is a tiny external store implemented with
`useSyncExternalStore` so the `Section_Rail` and the `Scroll_Island_Nav`
read **the same** active id on the same tick. That is what makes
Requirement 19.5 ("rail and island agree on a single active section") a
deterministic property rather than a racey IntersectionObserver duel.

## Components and Interfaces

This section documents the public surface of every new module and the
edits to existing components. Internal implementation details are left to
the implementation phase; only contracts that other code depends on are
locked in here.

### `Motion_Engine` — `src/lib/motion-engine.ts`

The single animation utility module. Has no React-specific dependencies
beyond the `useSyncExternalStore` hook so it can be tree-shaken when imports
are removed. (Requirements 1.2, 17.1, 19.1.)

```ts
// Public API.

/** Subscribes to `prefers-reduced-motion: reduce`. SSR-safe (returns
 *  `false` on the server). Updates within 100ms of a system change so
 *  Requirement 17.1's update-latency clause holds. */
export function useReducedMotionState(): boolean;

/** Returns a stable reference to the shared spring preset. Components must
 *  use this rather than inlining their own springs (Requirement 1.2). */
export const SHARED_SPRING: { type: "spring"; stiffness: 280;
  damping: 30; mass: 0.9 };
export function useSharedSpring(): typeof SHARED_SPRING;

/** Pre-baked `motion` variants used by the redesign. */
export const motionVariants: {
  containerTransform: { initial; animate; exit };  // for ProjectShowcase
  sharedAxis: { initial; animate; exit };          // for DeviceShowcase
  staggeredReveal: (stepMs: number) => Variants;   // for hero, tech grid
  bottomSheet: { initial; animate; exit };         // for mobile showcase
};

/** Returns a snapshot of `navigator.connection.effectiveType` if the
 *  Network Information API is available, else `"4g"`. Updates on the
 *  `change` event. Drives Requirement 16.6's slow-connection fallback
 *  and Requirement 1.4's 800ms ripple decay on 2g/3g. */
export function useEffectiveConnectionType():
  "slow-2g" | "2g" | "3g" | "4g";

/** Test-only spy. Production builds export an empty object so the bundle
 *  is unaffected. Property test 19.1 imports this and asserts both
 *  counters stay at 0 during reduced-motion renders. */
export const __motionEngineSpy: {
  readonly motionAnimateCalls: number;
  readonly gsapTimelineCalls: number;
  reset(): void;
};

/** Internal: every `motion(...)` import in the redesign is routed through
 *  `m()`, which short-circuits to a static <component> when reduced-motion
 *  is active, and increments the spy in dev/test builds. */
export function m<T extends keyof JSX.IntrinsicElements>(tag: T):
  React.ComponentType<MotionProps<T>>;

/** Internal: every `gsap.timeline()` call in the redesign goes through
 *  `gsapTimeline()`, which returns a no-op timeline under reduced motion. */
export function gsapTimeline(opts?: gsap.TimelineVars): gsap.core.Timeline;
```

The two wrappers `m()` and `gsapTimeline()` are how Requirement 19.1
becomes a property: a single `mockMatchMedia('reduce')` flips a boolean,
the wrappers refuse to schedule timelines, and the spy stays at zero
across every section render.

### Phone_Frame variants — directory layout

```
src/components/ui/
├── iphone-frame.tsx                  ← unchanged (still default-exported)
├── iphone-frame.helpers.ts           ← unchanged
├── iphone-frame.helpers.test.ts      ← unchanged
├── iphone-frame.test.tsx             ← unchanged
├── android-phone-frame.tsx           [NEW]
├── android-phone-frame.helpers.ts    [NEW]
├── android-phone-frame.test.tsx      [NEW]
├── phone-frame.tsx                   [NEW — variant dispatcher]
└── phone-frame.test.tsx              [NEW]
```

The `iphone-frame.tsx` file is **not edited** as part of this work — every
existing test against it must continue to pass byte-for-byte
(Requirement 19 maintainer pact + the explicit instruction to preserve
existing exports).

The new `phone-frame.tsx` is a thin dispatcher:

```ts
// src/components/ui/phone-frame.tsx
export type DeviceVariant = "android" | "ios";

export interface PhoneFrameProps {
  variant: DeviceVariant;
  width?: number;
  // …everything from IPhoneFrameProps that has a meaningful Android
  //   counterpart, narrowed at the call site:
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  showStatusBar?: boolean;
  screenColorScheme?: "light" | "dark";
  screenBackground?: string;
}

export function PhoneFrame(props: PhoneFrameProps): ReactElement;
```

When `variant === "ios"` the dispatcher renders `<IPhoneFrame …/>` and
forwards every prop. When `variant === "android"` it renders
`<AndroidPhoneFrame …/>` with its variant-specific options
(`showGestureBar`, `pillIndicator`, `finish: "obsidian" | "porcelain"`).

`AndroidPhoneFrame` mirrors the **layout contract** of `IPhoneFrame` so
descendants can keep reading `var(--device-screen-bg)`:

- Renders `[data-device-screen]` with the same `--device-screen-bg`
  custom property and the same `device-screen-light` / `device-screen-dark`
  class hooks (Requirement 4.4 + preservation of existing CSS).
- Pushes children down by `paddingTop = statusBarTop + statusBarHeight + buffer`
  so app content does not collide with status-bar chrome.
- Renders an Android 16-flavoured status bar row instead of the iOS one.

### `Device_Variant_Selector`

```ts
// src/lib/device-variant.ts
import type { Project } from "@/lib/portfolio-data";

export type DeviceVariant = "android" | "ios";

/** Pure: same input → same output, no I/O. Property-tested by 19.8. */
export function selectDeviceVariant(project: Pick<Project, "id" | "device">):
  DeviceVariant {
  if (project.device === "android" || project.device === "ios") {
    return project.device;
  }
  // Hard-coded fallback for the two shipped projects.
  if (project.id === "lumen") return "ios";
  return "android"; // chime, and anything new without a declared variant
}
```

The function reads only from its argument. `device` is added as an
**optional** field on `Project` (see Data Models below), so projects that
predate this redesign default to `android` per Requirement 4.3.

### Status-bar component contracts

```ts
// android-phone-frame internals
function AndroidStatusBar(props: {
  tint: "#0a0a0b" | "#f4f4f5";
  top: number;
  height: number;
  fontPx: number;
}): ReactElement;
// Layout: [time]                              [signal · wifi · battery]
//         (left edge ~14px)                    (right edge ~14px)
// No Dynamic Island; instead a small camera punch-hole disc centered
// at top, ~10% of width tall.

function AndroidGestureBar(props: { tint: string; bottom: number; width: number }):
  ReactElement;
// 36% of screen width, 3px tall, fully rounded.
```

Lumen renders inside `IPhoneFrame` (Requirement 4.2). Chime renders inside
`AndroidPhoneFrame` (Requirement 4.2). Both consume the same
`screenBackground` colour token, and both expose `--device-screen-bg`,
so the existing `phone-screens/*` files do not need to change.

### `Device_Showcase` — `src/components/portfolio/device-showcase.tsx`

```ts
"use client";
export interface DeviceShowcaseProps {
  // No required props — reads from `projects` and `phoneScreensByProject`.
}
export function DeviceShowcase(): ReactElement;
```

Internally:

- A 200vh-tall `<section data-device-showcase>` between the hero and the
  projects grid (Requirement 3.1, mounted in `page.tsx`).
- A sticky inner stage that pins the `PhoneFrame` at the viewport center.
- `useScroll({ target: sectionRef, offset: ["start end", "end start"] })`
  produces a `progress` MotionValue.
- `useTransform(progress, [...], [...])` maps progress to:
  1. `screenIndex` (rounded) inside the active project.
  2. `projectIndex` (rounded), which flips the `PhoneFrame` variant
     between `chime → android` and `lumen → ios` (Requirement 3.5).
  3. The kicker text opacity per screen (Requirement 3.3).

A scroll-driven device showcase is illustrated below as a timeline:

```
   sectionScrollPx
     │
   0 ┤  ┌── chime (android)
     │  │   screen 1: "Realtime chat"
   ¼ ┤  │   screen 2: "Push delivery"
     │  └── screen 3: "Compose UI"
     │     ─── shared-axis transition + variant flip ───
   ½ ┤  ┌── lumen (ios)
     │  │   screen 1: "Voice-first AI"
   ¾ ┤  │   screen 2: "Moodboards"
     │  └── screen 3: "Shot lists"
   1 ┤
```

The kicker text uses the existing `motionVariants.sharedAxis` and the
500 ms budget from Requirement 3.4. The frame variant flip uses a
`motion.div` with `layout` that fades out the iOS bezel and fades in the
Android bezel within the 600 ms budget from Requirement 3.5.

**Mobile carousel fallback (`<768px`).** Replaces the scroll-pin with a
horizontally scrolling `<ul>` whose children are snap-aligned
(`scroll-snap-type: x mandatory`, `scroll-snap-align: center`). Pagination
dots underneath are buttons that call `el.scrollIntoView`. Touch swipe is
native scroll momentum; on release the closest snap target wins. This
satisfies Requirement 3.7 and Requirement 15.3 without a third-party
carousel library.

**Reduced-motion fallback.** Renders one `PhoneFrame` per project side by
side, each with the project's first screen and a small native pagination
control. No scroll listener attaches at all (Requirement 3.8).

**Slow-connection fallback (`2g` / `slow-2g`).** Renders a static screenshot
inside one `PhoneFrame` per project — no shaders, no scroll scrubbing
(Requirement 16.6).

**Lazy-load strategy.** Screen artwork (everything beyond
`screens[0]` for each project) is gated by an `IntersectionObserver` that
fires when the `Device_Showcase` section is within `200vh` of the
viewport. The first-screen images are eager-loaded so the section never
has an empty frame. (Requirement 3.9, 16.5.)

**Image asset layout.**

```
public/images/projects/
├── lumen/                               (existing)
│   ├── insp-01.webp … insp-05.webp
│   └── home-001.webp                    [NEW — showcase screen 1]
│   └── results-001.webp                 [NEW — showcase screen 2]
│   └── moodboard-001.webp               [NEW — showcase screen 3]
├── lumen-cover.png                      (existing)
├── preview_1.webp, preview_2.webp       (existing)
└── chime/
    ├── inbox-001.webp                   [NEW]
    ├── chat-001.webp                    [NEW]
    └── compose-001.webp                 [NEW]
```

Each image ships with an `srcSet` for `360w`, `720w`, and `1080w` per
Requirement 16.7.

### Container-transform `Project_Card → Project_Showcase`

`motion`'s shared `layoutId` is the container-transform (Requirement 5.1):

- Each `<motion.article layoutId={\`card-\${project.id}\`}>` in
  `ProjectsSection` is the source.
- The same `layoutId` is set on the showcase's outer panel so `motion`
  interpolates position, size, and border radius automatically — there
  is no cross-fade.
- The shared cover artwork inside both source and destination uses
  `layoutId={\`cover-\${project.id}\`}` so the cover does not visually
  jump (Requirement 5.4).

```
Project_Card                           Project_Showcase
┌──────────┐                          ┌────────────────────────────────┐
│ [cover]  │  ── 600ms layout ──▶    │ [cover]                        │
│          │     (layoutId="card-X") │                                │
│ title    │                          │ title                          │
│ stack    │                          │ description                    │
└──────────┘                          │ side panel · CTAs              │
                                      └────────────────────────────────┘
```

Activation and abort flow:

```
user click / tap / Enter / Space
            │
            ▼
   setActiveProject(p.id)
            │  (state-driven layoutId pairing)
            ▼
   motion runs the layout transition
            │
            ├── fast path:  duration ≤ 616ms → keeps the morph
            │
            └── abort path: duration > 616ms → onLayoutAnimationComplete
                            never fired in time → the showcase
                            calls `setOpenInstant(true)` which sets
                            `transition={{ duration: 0 }}` and snaps
                            the surface to its open state
```

The 600 ms ±16 ms budget (Requirement 5.2) is enforced by:

```ts
const BUDGET_MS = 600;
const ONE_FRAME = 16;

useEffect(() => {
  const id = setTimeout(() => {
    if (!hasSettled.current) setOpenInstant(true);
  }, BUDGET_MS + ONE_FRAME);
  return () => clearTimeout(id);
}, []);
```

`hasSettled` is flipped to `true` by `motion`'s `onLayoutAnimationComplete`.
A second activation while the transform is in progress is ignored by
guarding `setActiveProject` on `!isAnimating` (Requirement 5.5).

**Reverse transform on close.** The showcase's `onClose` only flips
`activeId` back to `null` if `hasSettled.current === true`. Otherwise it
unmounts immediately, satisfying Requirement 5.3's exception clause.
Under reduced motion both open and close are instant (Requirement 5.6).

**Focus management.**

- On open, focus moves to the close `<button>` after the transform
  settles (Requirement 5.7), via `useEffect(() => closeBtnRef.current?.focus(),
  [hasSettled])`.
- A focus trap implemented in a tiny `useFocusTrap(ref)` hook (queries
  the dialog's focusable descendants on each Tab keydown) keeps Tab/Shift-Tab
  cycling within the dialog (Requirement 17.3, 19.6).
- On close, focus returns to the originating `Project_Card`. The card
  registers itself in a `Map<projectId, HTMLElement>` ref pool that the
  showcase reads on unmount (Requirement 5.7, 19.4).

**Mobile bottom-sheet behavior (`<768px`).** The showcase mounts as a
`motion.aside` that animates `y` from `100%` to `0%` instead of running
the layout-shared transform. A pointer drag listener on the sheet header
tracks `dy`; on `pointerup` if `dy >= 80` the sheet calls `onClose`.
Otherwise it springs back. Implemented with `motion`'s `drag="y"` and
`dragConstraints={{ top: 0 }}` (Requirement 15.2).

### `Palette_Swatcher` / `Material_Accent`

```ts
// src/components/portfolio/palette-swatcher.tsx
export type AccentSeedId =
  | "android-green"
  | "compose-purple"
  | "material-blue"
  | "sunset-coral"
  | "mono-graphite";

export interface AccentSeed {
  id: AccentSeedId;
  name: string;        // accessible name, Requirement 11.6
  // OKLCH hue/saturation/lightness for the seed.
  // Stored as plain numbers so the runtime can derive variants.
  h: number; s: number; l: number;
}

export const PALETTE_SEEDS: readonly AccentSeed[];

export function PaletteSwatcher(props: {
  /** Compact form for the SiteHeader, expanded form for ScrollIslandNav. */
  layout: "header" | "menu";
}): ReactElement;
```

**CSS variable strategy.** On `:root`:

```css
:root {
  /* Accent — three OKLCH numbers + the resolved hex. */
  --accent-h: 142;
  --accent-s: 0.18;
  --accent-l: 0.55;
  --accent-hex: #34a853;

  /* Derivatives that other components consume. */
  --ring-accent: oklch(var(--accent-l) var(--accent-s) var(--accent-h));
  --ripple-accent: oklch(0.7 var(--accent-s) var(--accent-h) / 0.4);
  --halo-stop-1: oklch(0.7 var(--accent-s) var(--accent-h));
  --halo-stop-2: oklch(0.85 calc(var(--accent-s) * 0.6) var(--accent-h));
}
```

When `PaletteSwatcher` activates a seed, it writes the four numbers above
on `document.documentElement.style.setProperty(...)`. The transition is
driven by a top-level `:root { transition: ... 250ms; }` rule on every
property listed above (Requirement 11.3). No React tree re-render is
required.

**Persistence.** The active seed id is stored in `localStorage` under
`material-accent-seed`. On mount the provider reads it, validates that
it is in the seed table, and applies it. Missing or invalid value falls
back to `android-green` (Requirements 11.4, 11.5).

**Contrast guard (Requirement 11.7 + 19.9).** Before writing
`--ring-accent`, the provider runs a pure helper:

```ts
// src/lib/contrast.ts
export function ensureRingContrast(seed: AccentSeed,
  background: { l: number }): { l: number; s: number; h: number } {
  // Iterate L* in steps of 0.05 until WCAG sRGB contrast ≥ 3:1.
  // Hue and saturation are preserved (so halo + ripple stay vivid),
  // only lightness shifts (Requirement 11.7).
}
```

This is a **pure function over numbers** — exactly the shape needed for
property test 19.9.

**Integration with shaders + ripples.** The hero halo shader
(`@paper-design/shaders-react`) is configured to read its primary stop
from `getComputedStyle(...).getPropertyValue('--halo-stop-1')` on mount
and on a `palette-changed` custom event. Material ripples (a tiny
`<Ripple>` primitive in `src/components/ui/ripple.tsx`) spawn inside any
button via a single `usePressRipple()` hook and read `--ripple-accent`
at the moment of the press.

### `Section_Rail` — `src/components/portfolio/section-rail.tsx`

```ts
"use client";
export function SectionRail(): ReactElement;
```

A single fixed `<aside>` pinned to the right edge on `≥1024px` viewports
and to the left edge on `640–1023px`, hidden under `640px`
(Requirement 9.6).

```
viewport
┌──────────────────────────────────────────────┬──┐
│  hero                                        │  │
│                                              │  │   filled
│  device showcase                             │██│  ← progress
│                                              │██│
│  projects                                    │██│
│                                              │  │   unfilled
│  experience                                  │  │
│                                              │  │
│  contact                                     │  │
│                                              │  │
└──────────────────────────────────────────────┴──┘
                                              section_rail
```

Implementation:

- A 2 px wide track absolutely positioned inside the rail, full height.
- A `<motion.div>` filled track whose `scaleY` is bound to
  `useScroll({ container: undefined }).scrollYProgress` (Requirement 9.2).
- An `IntersectionObserver` watches each section in
  `ActiveSectionStore.SECTION_IDS = ["home","components","projects",
  "experience","contact"]` with `rootMargin: "-40% 0px -55% 0px"` so the
  active section flips when its top crosses ~40% of the viewport.
- The active section's id is published to `ActiveSectionStore`, which is
  the same store `ScrollIslandNav` subscribes to. They cannot disagree
  by construction (Requirement 9.4, 19.5).
- The visible "highlighted segment" is a small `<motion.div>` whose `top`
  and `height` track the active section's bounding rect; the spring
  transition completes within 300 ms (Requirement 9.3).
- Under reduced motion, the fill is updated on scroll without easing
  (Requirement 9.5).

The SectionRail does **not** maintain its own active-section state. It
reads from and writes to `ActiveSectionStore`, which is the single source
of truth.

### Hero Section motion — edits to `profile-section.tsx`

The existing `ProfileSection` is **kept as a Server Component shell**.
The animated children become Client Components, mounted inside it:

- `<HeroStaggerOrchestrator>` wraps the avatar / name / role / meta /
  bio / DSA / socials block in a `<motion.div variants={
  motionVariants.staggeredReveal(80) }>` (Requirement 2.1).
- `<AnimatedCounter target={500} suffix="+" />` replaces the static
  `"500+"` in the DSA stats line (Requirements 2.5, 19.2).
- `<MaterialHaloShader>` is the existing `@paper-design/shaders-react`
  scene, but the colours are now derived from `--halo-stop-1` /
  `--halo-stop-2` and the shader **does not mount** until the avatar's
  `IntersectionObserver` reports it is within `200vh` of the viewport
  (Requirements 2.3, 16.4). Until then a static gradient placeholder
  renders.
- `<AvatarParallaxTilt>` wraps the `LiquidMetalAvatar` and applies a
  `useMotionValue`-driven `rotateX` / `rotateY` capped at 8°
  (Requirement 2.4). Under reduced motion the wrapper short-circuits to
  a passthrough (Requirement 2.6).

`AnimatedCounter` contract:

```ts
"use client";
interface AnimatedCounterProps {
  target: number;
  suffix?: string;     // e.g. "+"
  durationMs?: number; // default 1500, max 1500 by Requirement 2.5
  className?: string;
}
export function AnimatedCounter(props: AnimatedCounterProps):
  ReactElement;
```

It uses `motion`'s `useSpring` with stiffness/damping tuned so the spring
settles within `durationMs`. After settle, it renders the bare `target`
as plain text (Requirement 2.5 — "displays the final target value as
plain text once converged"). Under reduced motion it renders the target
on first paint (Requirements 2.6, 17.2).

### Tech Stack Magnetic Hover — edits to `tech-icon.tsx`

`TechIcon` becomes a Client Component (it currently is a server
component). Behavior:

- Wraps each icon in a `<motion.span>` with two `useMotionValue`s tracking
  pointer offset, capped at 8 px translation each axis
  (Requirement 6.1).
- A `framer-motion` `useSpring` returns the icon to origin within 400 ms
  on `pointerleave` (Requirement 6.1).
- Tooltip is a `floating-ui` (already pulled in as a transitive dep via
  `radix-ui`) `useFloating()` positioned popover, mounted on hover,
  focus, and tap (Requirement 6.2, 6.3, 6.5).
- Stagger choreography on first viewport intersection: a
  `motionVariants.staggeredReveal(40)` parent variant
  (Requirement 6.4).
- Keyboard parity: the wrapping `<button type="button">` is
  Tab-reachable and accepts Enter / Space; tooltip opens on `:focus-visible`.

Under reduced motion: no magnetic transform, no stagger, tooltip behavior
unchanged (Requirement 6.6).

### Intro Overlay — edits to `intro-overlay.tsx`

The existing GSAP FLIP morph is preserved in full (Requirement 13.1).
Two additions sit **on top of** the existing overlay:

```
intro-host (existing GSAP-driven container)
├── android-boot-overlay [NEW]   ← Android 16 status-bar reveal + logo
│       ──────── completes within 1800ms ────────
├── scroll-text-motion (existing GSAP intro)
└── runOutro() (existing FLIP morph onto data-morph-target="hero-name")
```

`AndroidBootOverlay` flow:

1. Mount → opaque black backdrop, status bar tokens animate in from
   the top (time fades in, signal/wifi/battery slide in from the right
   edge with 60ms stagger).
2. At ~600ms a centered "DHEERAJ" logo in the Android system-style font
   (`Roboto`/`Google Sans Display` if available, else our Geist Sans)
   fades in.
3. At ~1500ms the boot overlay starts dissolving and the existing
   `ScrollTextMotion` becomes interactive.
4. Hard cap at 1800ms: `setTimeout(() => completeBoot(), 1800)`. If the
   step-2 timeline has not naturally completed, `completeBoot()` cuts it
   (Requirement 13.2).

The existing `runOutro()` continues to do the FLIP morph onto
`[data-morph-target="hero-name"]` exactly as today (Requirement 13.1,
20.3). Skip behavior (Esc / Enter) and `intro-seen` localStorage flag are
preserved (Requirement 13.3, 13.4, 20.3).

**Reduced-motion fast-handoff (Requirement 13.5).** The overlay's
top-level effect guards on `useReducedMotionState()`:

```ts
useEffect(() => {
  if (!reduced) return;
  const id = setTimeout(() => {
    document.documentElement.dataset.introActive = "done";
    try { window.localStorage.setItem("intro-seen", "1"); } catch {}
    onDone();
  }, 200);
  return () => clearTimeout(id);
}, [reduced]);
```

It reaches the same `intro-seen=1` end state and calls `onDone()`
within 200 ms, so the portfolio renders fully (Requirement 13.5). The
existing `IntroGate` already short-circuits to "skip" when reduced
motion is on, so this branch only ever runs if a user enabled reduced
motion **after** the gate decided to show the overlay; the boot overlay
must still hand off cleanly.

**Active suppression while overlay is mounted or unmounting
(Requirement 13.6).** `data-intro-active` on `<html>` is not just an
advisory flag — `globals.css` carries an `:where(html[data-intro-active]:not([data-intro-active="done"])) main *`
rule that pauses portfolio `motion`/CSS animations for as long as the
overlay is in the DOM. The attribute is set on mount (`"intro"` /
`"boot"`) and only flipped to `"done"` (which releases suppression)
**after** the overlay's outro fully unmounts the overlay node — covering
the active phase, the FLIP outro, and the unmount tail. This guarantees
no portfolio animation begins until the overlay is gone, matching the
"persists until fully unmounted" obligation in Requirement 13.6.

### Component Gallery — `src/components/portfolio/component-gallery.tsx`

Mounted alongside the existing Tech Stack at `#components`. The existing
Tech Stack grid stays exactly where it is (Requirement 18.3). The
gallery is a sibling block:

```
section#components
├── existing Tech Stack header + grid              (unchanged)
└── ComponentGallery [NEW]
    ├── M3FAB             — extended FAB with ripple
    ├── M3Switch          — Material 3 switch with handle morph
    ├── M3Chip            — assist chip with ripple
    ├── M3RippleButton    — bare button demo for the ripple primitive
    └── M3Snackbar        — open-on-click snackbar with motion entry
```

Each primitive is a small Client Component. They share the
`usePressRipple()` hook so ripple colour is driven by `--ripple-accent`
(Requirement 1.4, 18.4). State changes (e.g. switch toggle, snackbar
open) work even under reduced motion; only the motion is removed
(Requirement 18.5).

If `ComponentGallery` mounts with zero primitives available (e.g.
configuration error or primitive-loading failure for every entry), the
gallery returns `null` so the entire section is hidden rather than
rendering an empty container (Requirement 18.6). The existing Tech
Stack block above it is unaffected.

The `#components` anchor element keeps its existing
`scroll-mt-32`-equivalent so `SiteHeader` navigation still lands at the
section start (Requirement 18.2, 20.4).

## Data Models

### Existing types — unchanged

`profile`, `experience`, `socialLinks`, `techStack`, `techById`,
`navItems`, `footerLinks`, `stats`, `education` are all consumed
unchanged (Requirements 20.1, 20.4).

### `Project` — additive optional fields only

```ts
// src/lib/portfolio-data.ts
export type Project = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  links: { github?: string; site?: string };
  stack: string[];

  // ── NEW optional fields. Existing entries leave them undefined and
  //    fall back to defaults documented per field. (Requirement 20.2.)
  device?: "android" | "ios";
  // showcaseScreens may also live in the existing
  // `phoneScreensByProject` registry, in which case `device` is the
  // only project-level data needed.
  showcaseKickers?: ReadonlyArray<{ screenId: string; kicker: string }>;
};
```

Defaults / fallbacks:

| Field              | Absent → Behavior                                                   |
|--------------------|---------------------------------------------------------------------|
| `device`           | `selectDeviceVariant` returns `"android"` (Requirement 4.3, 19.8)  |
| `showcaseKickers`  | DeviceShowcase derives a kicker from `project.subtitle` per screen  |

The two shipped projects are seeded:

```ts
{ id: "chime", device: "android", showcaseKickers: [...] }
{ id: "lumen", device: "ios",     showcaseKickers: [...] }
```

### `PhoneScreen` — unchanged structurally

`PhoneScreen` and `PhoneScreenProjectEntry` from
`src/components/portfolio/phone-screens/index.tsx` are unchanged. Both
`AndroidPhoneFrame` and `IPhoneFrame` consume the same `screenBackground`
and `screenColorScheme` fields, so no migration of `phoneScreensByProject`
is needed.

### `AccentSeed` — new

```ts
// src/components/portfolio/palette-swatcher.tsx
export type AccentSeedId =
  | "android-green" | "compose-purple" | "material-blue"
  | "sunset-coral" | "mono-graphite";

export interface AccentSeed {
  id: AccentSeedId;
  name: string;       // human-readable, used as accessible name
  h: number;          // OKLCH hue   ∈ [0, 360)
  s: number;          // OKLCH chroma ∈ [0, 0.4]
  l: number;          // OKLCH lightness ∈ [0, 1]
}

// Compile-time guarantee the table has 3-5 seeds (Requirement 11.1).
export const PALETTE_SEEDS: readonly [AccentSeed, AccentSeed, AccentSeed,
  AccentSeed, AccentSeed];
```

### `ActiveSectionStore` — new

```ts
// src/components/portfolio/active-section-store.ts
export const SECTION_IDS = ["home","components","projects",
  "experience","contact"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const activeSectionStore: {
  subscribe(listener: () => void): () => void;
  getSnapshot(): SectionId;
  setActive(id: SectionId): void;     // called by SectionRail's IO
};
```

Both `Section_Rail` and `Scroll_Island_Nav` consume it via
`useSyncExternalStore`. There is exactly one writer (the rail's
IntersectionObserver), so by construction Requirement 19.5 holds.


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The properties below were derived from the per-criterion prework analysis and consolidated to remove redundancy. Smaller per-criterion checks (specific durations, single-instance presence checks) are handled by example tests in the Testing Strategy and are not lifted into properties. Each property below holds across many inputs and is the most cost-effective unit to validate.

### Property 1: Reduced-motion universally suppresses timelines

*For any* primary section S in the set `{Hero_Section, Device_Showcase, Projects, Experience_Timeline, Contact_Section, Site_Footer, Intro_Overlay, Scroll_Island_Nav, Component_Gallery}`, when `Reduced_Motion_State` is true at mount, S SHALL render its final visual state without invoking any `motion` animation timeline (`animate`, `useScroll`, `AnimatePresence` enter/exit) or any `gsap` timeline.

**Validates: Requirements 2.6, 3.8, 5.6, 6.6, 7.5, 8.6, 9.5, 13.5, 14.7, 17.2, 18.5, 19.1**

### Property 2: Animated_Counter convergence

*For any* finite numeric target T initialized on an `Animated_Counter`, the rendered text content SHALL equal `String(T)` within 1500ms of mount.

**Validates: Requirements 2.5, 19.2**

### Property 3: Project_Card activation parity

*For any* `Project_Card` rendered from `projects` data and *for any* activation method in the set `{click, Enter key, Space key}`, activating the focused card SHALL invoke the same `onOpen` handler exactly once with the project's `id`.

**Validates: Requirements 5.1, 19.3**

### Property 4: Container_Transform identity and focus management

*For any* project p in `projects`, opening then closing the `Project_Showcase` SHALL satisfy all of the following: (a) the cover artwork in the source `Project_Card` and the destination `Project_Showcase` share a `motion.layoutId` derived from `p.id`; (b) initial focus moves to the close control on open; (c) Tab and Shift+Tab cycles starting from any focusable child of the showcase return to that child within one full cycle without escaping the trap; (d) on close, focus returns to the originating `Project_Card` element.

**Validates: Requirements 5.4, 5.7, 19.4, 19.6**

### Property 5: Container_Transform timing ceiling

*For any* project p in `projects`, the open animation of `Project_Showcase(p)` SHALL reach the "open" visual state no later than 616ms after activation, even if the underlying layout-completion event never fires.

**Validates: Requirements 5.2**

### Property 6: deviceVariantSelector total purity

*For any* `ProjectLike` value `p` (with or without a `device` field), `deviceVariantSelector(p)` SHALL return a value in the set `{"android", "ios"}` AND repeated calls with the same input SHALL return the same value AND when `p.device` is `undefined` the return value SHALL be `"android"`.

**Validates: Requirements 4.3, 19.8**

### Property 7: Accessible name on icon-only controls

*For any* `Project_Card` in the rendered grid AND *for any* `Tech_Stack_Grid` icon AND *for any* icon-only button or link (social icons, `Palette_Swatcher` swatches, `Scroll_Island_Nav` controls), the rendered DOM SHALL include a non-empty accessible name discoverable via `getByRole(role, { name: predicate })`.

**Validates: Requirements 17.5, 19.7**

### Property 8: Focus-ring contrast across seed × theme

*For any* seed S in the `Material_Accent` palette AND *for any* theme T in `{light, dark}`, the focus-ring color resolved by `resolveFocusRing(S, T)` SHALL satisfy a WCAG contrast ratio of at least 3:1 against the surface token of T.

**Validates: Requirements 11.7, 17.4, 19.9**

### Property 9: Section_Rail and Scroll_Island_Nav agreement

*For any* scroll position on a viewport at least 768px wide, `useActiveSection(SECTION_IDS)` SHALL return exactly one id, AND the `Section_Rail`'s rendered active segment SHALL correspond to that id, AND the `Scroll_Island_Nav`'s reported active section SHALL equal that id.

**Validates: Requirements 9.4, 19.5**

### Property 10: Ripple bounded settle from press coordinates

*For any* primary interactive surface S in `{Project_Card, Palette_Swatcher swatch, Material FAB, Contact CTA, Tech_Stack_Grid icon, Scroll_Island_Nav action}` AND *for any* press coordinates `(x, y)` inside S's bounding rect AND *for any* reported `effectiveType`, the `Ripple` SHALL originate at `(x, y)` AND SHALL reach final opacity zero within 600ms when `effectiveType ∈ {4g, unknown}` and within 800ms when `effectiveType ∈ {2g, 3g, slow-2g}`.

**Validates: Requirements 1.4, 8.5, 11.6, 18.4**

### Property 11: Backwards-compatible optional project fields

*For any* `Project` value with the new optional fields (`device`, `showcaseScreens`) absent, rendering `Project_Card(p)` and including `p` in `Device_Showcase` SHALL succeed with no runtime error AND SHALL render a graceful fallback (default Android variant; project omitted from `Device_Showcase` if no `showcaseScreens` declared).

**Validates: Requirements 20.2**

### Property 12: Coarse-pointer substitutes hover with press feedback

*For any* primary interactive surface S in `{Project_Card, Tech_Stack_Grid icon, Hero_Section CTA}`, when `matchMedia("(pointer: coarse)")` is active, S SHALL: (a) reach all hover-revealed critical content via tap, AND (b) suppress 3D tilt transforms on `Project_Card` AND magnetic translations on `Tech_Stack_Grid` icons.

**Validates: Requirements 1.5, 4.8, 6.5, 15.5**

### Property 13: Showcase scroll-progress monotonicity

*For any* two scroll-progress values `p1 < p2` in `[0, 1]`, `resolveActiveIndex(p1) ≤ resolveActiveIndex(p2)`, AND `resolveActiveIndex(0) = 0`, AND `resolveActiveIndex(1) = N - 1` where `N` is the total number of `ShowcaseScreen` items.

**Validates: Requirements 3.2**

### Property 14: Slow-connection static fallback

*For any* reported `effectiveType` in `{2g, slow-2g}`, the page SHALL render no shader element AND SHALL NOT subscribe to scroll-scrubbing inside `Device_Showcase` AND SHALL render the static-frame fallback for the showcase region.

**Validates: Requirements 16.6**

### Property 15: Material_Accent persistence round-trip

*For any* seed `s` in the palette, calling `setSeed(s)` followed by re-initializing the `useMaterialAccent` hook (clearing in-memory state and re-reading `localStorage`) SHALL yield `s` as the restored seed AND SHALL set `--accent-h` on `document.documentElement` to the canonical hue value for `s`.

**Validates: Requirements 11.3, 11.4**

### Property 16: Ripple decay duration is a step function of connection type

*For any* `effectiveType` ∈ {`"slow-2g"`, `"2g"`, `"3g"`, `"4g"`}, the pure helper `rippleDecayMs(effectiveType)` SHALL return `800` when `effectiveType ∈ {"2g","3g"}` and SHALL return `600` otherwise.

**Validates: Requirements 1.4**

### Property 17: Staggered-reveal delays are linear in child index

*For any* `stepMs` ∈ [40, 160] and *for any* `childIndex` ∈ [0, 7], the per-child `transition.delay` produced by `motionVariants.staggeredReveal(stepMs)` SHALL equal `(stepMs * childIndex) / 1000` and SHALL be finite.

**Validates: Requirements 2.1, 6.4**

### Property 18: Avatar tilt is bounded by ±8 degrees

*For any* pointer-relative coordinates `(x, y)` ∈ [0, 1]², the pure helper `computeTilt(x, y)` SHALL return `(rotateX, rotateY)` such that `|rotateX| ≤ 8` and `|rotateY| ≤ 8`.

**Validates: Requirements 2.4**

### Property 19: Magnetic-hover offset is bounded by 8 pixels

*For any* pointer position `(x, y)` and *for any* element bounds `{ width, height }` with `width > 0` and `height > 0`, the pure helper `computeMagneticOffset(pointer, bounds)` SHALL return `(dx, dy)` such that `|dx| ≤ 8` and `|dy| ≤ 8`.

**Validates: Requirements 6.1**

### Property 20: Section rail fill is a clamp of scroll progress

*For any* numeric `progress` (including negatives, NaN, and values > 1), the pure helper `fillFromScrollProgress(progress)` SHALL return a value `f` such that `0 ≤ f ≤ 1`, and `f === progress` whenever `0 ≤ progress ≤ 1`.

**Validates: Requirements 9.2**

### Property 21: Body and large-text design tokens satisfy WCAG contrast

*For any* `(foreground, background)` pair in `THEME_TOKEN_PAIRS.body` (resp. `.large`) and *for any* theme ∈ {light, dark}, the pure helper `wcagContrast(fg, bg)` SHALL return a ratio `r` such that `r ≥ 4.5` (resp. `r ≥ 3.0`).

**Validates: Requirements 12.4**


---

## Performance Plan

Targets (Req 16): LCP ≤2.5s, CLS ≤0.10, INP ≤200ms on Moto G class mobile profile.

**Shader deferral** (Req 16.4):

- Avatar shader (`@paper-design/shaders-react`) and any hero-halo shader render `null` until their containing element is observed via `IntersectionObserver` with `rootMargin: "200vh"`.
- Until then a static gradient placeholder (CSS-only `radial-gradient` keyed off `--accent-halo`) holds the shape so there is no CLS on hydration.

**Image responsive variants** (Req 16.7):

- All project covers and `ShowcaseScreen` art use `next/image` with explicit `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"` and `placeholder="blur"`.
- Source artwork stored under `public/images/projects/<id>/` at minimum 3 widths (mobile/tablet/desktop) — Next.js generates remaining variants at build time.

**Slow-connection static fallback** (Req 16.6, Property 14):

- `useMotionCapabilities()` exposes `effectiveType`. When it resolves to `2g` or `slow-2g`:
  - All shaders skip mount entirely (return `null`).
  - `Device_Showcase` swaps to the reduced-motion static layout (one screen per project, no scroll subscription).
  - `Hero_Section` halo reduces to a single CSS gradient with no animation.

**Code-splitting**:

- `Device_Showcase`, `Component_Gallery`, and `Project_Showcase` are loaded via `next/dynamic` with `ssr: false` for the parts that depend on `motion`'s `useScroll` or shader libraries.
- `Component_Gallery` lazy-imports each M3 primitive so the initial page payload only loads what is above the fold.
- `gsap` stays in the `intro-*` chunk only — already true in the current build.

**Layout-shift prevention**:

- All `PhoneFrame` instances declare a fixed `aspectRatio` via inline style so the slot reserves space before the bezel renders.
- `Device_Showcase` outer wrapper is `position: relative` with `min-height: 300vh` (the scroll-region height) reserved before screens hydrate.
- Variant transition (`android` ↔ `ios`) inside `Phone_Frame` cross-fades inside a fixed-aspect outer wrapper to avoid CLS during the 600ms swap.

**Interaction-to-Next-Paint** (Req 16.3, INP ≤200ms):

- `Container_Transform` open: `motion.layoutId` produces a single GPU-accelerated transform; opening a showcase is a `setState` followed by one paint frame. Target ≪200ms.
- `Scroll_Island_Nav` dropdown: pre-rendered at `display: none` is forbidden by Property 1; instead the tray uses `motion`'s `AnimatePresence` and `mountOnEnter`, with `opacity` + `transform` only.
- Form-field focus: pure CSS state change (no JS); 0ms JS work.
- Swatcher activation: writes one CSS variable on `documentElement`; cascade is async-batched by the browser. Target ≪50ms.

---

## Accessibility Plan

**Focus-ring tokens** (Req 17.4 + Property 8):

- Single CSS class `.focus-ring` applied via `:focus-visible` selector across all interactive elements.
- `outline: 2px solid var(--accent-ring)` + `outline-offset: 2px`.
- `--accent-ring` is the contrast-resolved tonal variant per `resolveFocusRing(seed, theme)`.

**Keyboard activation parity** (Req 19.3 + Property 3):

- All clickable surfaces use semantic `<button>` or `<a>` so Enter/Space activation is browser-native.
- `Project_Card` is wrapped in a `<button type="button">` with the cover artwork as visual content. Click handler is the same handler invoked by Enter and Space.
- `Phone_Frame` in `Device_Showcase` is wrapped in a `<button>` for the same reason.

**Focus-trap utility** (`use-focus-trap.ts`):

```ts
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  options: { active: boolean; initialFocusSelector?: string; onEscape?: () => void },
): void;
```

- On activate: collect all focusable descendants via standard selector; move focus to `initialFocusSelector` (or first focusable).
- On `Tab` at last focusable: redirect to first.
- On `Shift+Tab` at first focusable: redirect to last.
- On `Escape`: call `onEscape`.
- On deactivate: restore focus to whatever was focused before activation.

Used by `Project_Showcase` and `Scroll_Island_Nav` dropdown.

**Accessible-name guarantees** (Req 17.5, 19.7 + Property 7):

- Every icon-only `<button>` and `<a>` has an explicit `aria-label`.
- Codified in a small lint utility that runs in tests: `assertAccessibleName(node)` walks the rendered tree and asserts every `role="button"` / `role="link"` resolves a non-empty name from the accessible-name algorithm.
- `socialLinks`, `techStack`, swatcher seeds, and `ScrollIslandNav` actions all carry display-name fields already, so the labels come from data, not duplicated strings.

**Reduced-motion final-state rendering** (Req 17.2 + Property 1):

- `Reveal` component branches on `useReducedMotion()`: when true, returns children with `is-visible` applied immediately and no `IntersectionObserver` wired.
- All `motion.*` components consult `useReducedMotion()` and pass `transition={{ duration: 0 }}` plus `initial={false}` when reduced.
- `Device_Showcase` does not call `useScroll` at all when reduced.
- `Intro_Overlay` short-circuits via `IntroGate` (already implemented).

**A11y tree preservation during reveals** (Req 17.6 + reflection P34):

- `Reveal` uses `opacity` + `transform` only, never `display: none` or `visibility: hidden`.
- `AnimatePresence` exits use `opacity` so removed elements briefly stay in the tree until the exit animation completes.

**No color-only state communication** (Req 17.7 + reflection P35):

- Active section indicator: rail uses both color AND a thicker segment width.
- Form validation: error messages are textual + carry an `aria-invalid="true"` attribute on the field.
- Success/error after submit: text + icon (lucide `Check` / `AlertCircle`), not color alone.
- Active swatcher seed: `aria-pressed="true"` + checkmark glyph in addition to ring color.

**Tab order = source order** (Req 17.3 + reflection P36):

- No `tabindex > 0` anywhere. Document order is the tab order.
- Intentional traps documented: `Project_Showcase`, `Scroll_Island_Nav` dropdown.

**Touch targets** (Req 15.4 + reflection P17):

- Tailwind utility `min-h-11 min-w-11` (44×44 at base 16px) applied to every interactive control under 768px via a responsive variant.

---

## Error Handling

The redesign has three failure surfaces worth designing for explicitly. Everything else falls through to React's normal error boundary.

**1. Animation runtime errors**

- `motion` and `gsap` errors must never crash the page. The `Intro_Overlay` already has a fallback: `try { ... } catch { localStorage write skipped }`. The same pattern is applied around every `gsap.timeline` call inside `IntroBoot`.
- For `motion.layoutId` failures (e.g. element unmounted mid-transition), the showcase's `setTimeout(ABORT_MS)` snap behavior is the safety net — the dialog reaches the open state regardless.

**2. Storage failures**

- `localStorage` may throw (private mode, quota, sandboxed iframes). All access to `localStorage["material-accent"]` and `localStorage["intro-seen"]` is wrapped in `try/catch`. On failure, the hook silently continues with the in-memory default.

**3. Asset / fetch failures**

- `Device_Showcase` screens that fail to render (component throws) are wrapped in a per-screen error boundary that falls through to a labeled placeholder (`<div role="img" aria-label="Screen unavailable">`) so the showcase remains scrollable.
- `IntersectionObserver` is feature-detected (existing pattern in `reveal.tsx`); when absent, components fall back to "always visible" so the page stays usable on legacy browsers.
- `navigator.connection` is feature-detected; when absent, `effectiveType: "unknown"` is used and the page renders the full visual experience.

**4. Capability detection failures**

- `matchMedia` is wrapped in `try/catch` for SSR. On the server, `useMotionCapabilities()` returns a frozen default `{ reducedMotion: false, coarsePointer: false, effectiveType: "unknown", saveData: false }` to keep SSR/CSR markup identical.

**5. Form submission**

- `Contact_Section`'s submit handler resolves to `{ ok: true } | { ok: false, errors: Record<string, string> }`. Network failure shows a single inline error ("Couldn't send. Try again, or email me directly.") with the email link as a fallback CTA.

---

## Testing Strategy

**Stack**: vitest + `@testing-library/react` + jsdom + fast-check (already installed).

**Test layout**:

```
src/
  lib/motion/__tests__/
    spring-presets.test.ts          // Req 1.2 / 9.3 / 14.3 / 5.2 bounds
    motion-engine.test.ts           // Req 17.1 latency, P44
  lib/theme/__tests__/
    material-accent.test.ts         // Property 8 (P9), Property 15
    use-material-accent.test.ts     // Property 15 round-trip (Req 11.3, 11.4)
  lib/scroll/__tests__/
    use-active-section.test.ts      // Property 9 (Req 9.4 / 19.5)
    section-ids.test.ts             // Req 20.4 (P28)
  components/ui/__tests__/
    device-variant-selector.test.ts // Property 6 (Req 4.3 / 19.8)
    ripple.test.tsx                 // Property 10 (Req 1.4)
    phone-frame.test.tsx            // Req 4.1 / 4.4
    android-phone-frame.test.tsx    // Req 4.4
  components/portfolio/
    profile-section.test.tsx        // Req 1.1, 2.1, 2.4 bounds, P12
    projects-section.test.tsx       // Property 3, Property 4, P21, P15
    project-showcase.test.tsx       // Property 4 (already exists, extend)
    device-showcase.test.tsx        // Property 13, P19, P20
    section-rail.test.tsx           // Property 9 (with island-nav)
    scroll-island-nav.test.tsx      // Property 9, Req 14.4 / 14.5
    intro-overlay.test.tsx          // Req 13.2 cap behavior
    component-gallery.test.tsx      // Req 18.x
    a11y.test.tsx                   // Property 1, Property 7, Property 12
```

**Property test configuration**:

- Each property test runs ≥100 iterations via `fc.assert(prop, { numRuns: 100 })`.
- Each test is tagged with a header comment: `// Feature: android-developer-design-overhaul, Property N: <text>`.
- Vitest `setup.ts` installs `matchMedia`, `IntersectionObserver`, and `ResizeObserver` shims; tests opt into reduced-motion / coarse-pointer per case.

**Per-property test plan**:

| Property | Generator                                                        | Target                                                  | Test file                                          |
| -------- | ---------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| P1       | `fc.constantFrom(...SECTIONS)` × `reducedMotion: true`           | spy on `motion.animate` / `gsap.timeline` — never called | `components/portfolio/a11y.test.tsx`               |
| P2       | `fc.integer({ min: 0, max: 1_000_000 })`                          | rendered text after 1500ms fake-timers === `String(T)`  | `components/portfolio/profile-section.test.tsx`    |
| P3       | `fc.constantFrom(...projects)` × `fc.constantFrom("click", "Enter", "Space")` | `onOpen` called once with `p.id`                | `components/portfolio/projects-section.test.tsx`   |
| P4       | `fc.constantFrom(...projects)`                                    | layoutId match + focus-restore + Tab cycle              | `components/portfolio/project-showcase.test.tsx`   |
| P5       | `fc.constantFrom(...projects)`                                    | open visual state reached ≤616ms via fake timers        | `components/portfolio/project-showcase.test.tsx`   |
| P6       | `fc.record({ id: fc.string(), device: fc.option(fc.constantFrom("android", "ios")) })` | return ∈ {android, ios}, idempotent | `components/ui/__tests__/device-variant-selector.test.ts` |
| P7       | `fc.constantFrom(...projects)` ∪ `fc.constantFrom(...techStack)` | `getByRole(... { name: predicate })` resolves            | `components/portfolio/a11y.test.tsx`               |
| P8       | `fc.constantFrom(...SEEDS)` × `fc.constantFrom("light", "dark")` | `contrastRatio(focusRing, surface) ≥ 3`                  | `lib/theme/__tests__/material-accent.test.ts`      |
| P9       | `fc.float({ min: 0, max: 1 })` (scrollY)                         | rail.activeId === island.activeId === useActiveSection() | `components/portfolio/section-rail.test.tsx`       |
| P10      | `fc.tuple(surfaceKind, fc.float(0,1), fc.float(0,1), effectiveType)` | ripple settle ≤600ms or 800ms; origin matches coords  | `components/ui/__tests__/ripple.test.tsx`          |
| P11      | `fc.record({ id, title, ... }, { withDeletedKeys: true })`        | render succeeds, fallback variant === "android"          | `components/portfolio/projects-section.test.tsx`   |
| P12      | `fc.constantFrom(card, techIcon, heroCTA)` × coarse-pointer shim  | tap reveals tooltip; no rotateX/Y on cards               | `components/portfolio/a11y.test.tsx`               |
| P13      | `fc.float(0,1)` × `fc.float(0,1)` with `p1 ≤ p2`                  | `resolveActiveIndex(p1) ≤ resolveActiveIndex(p2)`        | `components/portfolio/device-showcase.test.tsx`    |
| P14      | `fc.constantFrom("2g", "slow-2g")`                                | no shader DOM, no `useScroll` subscription               | `components/portfolio/device-showcase.test.tsx`    |
| P15      | `fc.constantFrom(...SEEDS)`                                       | round-trip persistence + `--accent-h` set               | `lib/theme/__tests__/use-material-accent.test.ts`  |

**Example tests (non-property)** — one example test per requirement that classified as EXAMPLE in prework. Covered in:

- `intro-overlay.test.tsx` — Req 13.2, 13.3, 13.4, 13.6.
- `phone-frame.test.tsx` — Req 4.4 (per-variant chrome).
- `palette-swatcher.test.tsx` — Req 11.1 (3–5 seeds), Req 11.2 (placement).
- `experience-section.test.tsx` — Req 7.1, 7.2.
- `contact-section.test.tsx` — Req 8.1, 8.2, 8.3.
- `component-gallery.test.tsx` — Req 18.1, 18.2, 18.3.
- `device-showcase.test.tsx` — Req 3.1, 3.4, 3.5, 3.7.
- `responsive.test.tsx` — Req 9.6 (rail hidden <640), Req 14.1 (island pinned ≥480), Req 15.1, 15.6.

**Integration / smoke tests** (CI Lighthouse run, separate from vitest):

- Req 16.1 (LCP), Req 16.2 (CLS), Req 16.3 (INP), Req 12.5 (no CLS on theme switch) — measured by Lighthouse on a Moto G profile in CI.
- Req 16.4 / 16.5 — verified by mocking `IntersectionObserver` in vitest and asserting deferred initialization.

**Existing test extension**:

- `src/components/portfolio/project-showcase.test.tsx` already exists. It is extended (not replaced) to cover Properties 4 and 5 by adding `fc.assert` blocks alongside the existing example tests.

---

## Risks and Open Questions

1. **Android system-bar visual fidelity** — The Android 16 status-bar chrome is a moving target across OEMs (Pixel vs. Samsung One UI vs. stock AOSP). The design fixes on a Pixel-flavored interpretation. **Open question**: do we want a second "stock AOSP" finish, or is Pixel-only acceptable for the MVP?
2. **GSAP vs. motion conflict** — Both libraries write to `transform` on the same element (the hero name during FLIP, while `motion`'s `Reveal` is also active on its parent). The current intro-overlay code already navigates this by mounting/unmounting in lock-step; the new `IntroBoot` reuses the same pattern, but the addition of an `App_Boot_Animation` increases the surface area. **Mitigation**: keep `IntroBoot` rendering only `motion`-free DOM (raw elements), and reserve GSAP solely for the FLIP morph. Double-check via a smoke test that no `motion` component exists inside the intro DOM tree.
3. **Layout shift from device-frame variant swap** — When `Device_Showcase` crosses a project boundary, the `android` and `ios` variants render at the same `width` but different aspect ratios (0.45 vs. 0.477). **Mitigation**: outer wrapper has a fixed aspect ratio equal to the larger of the two so neither variant changes the parent layout. Confirmed in §4.
4. **`navigator.connection` cross-browser support** — Safari does not expose `navigator.connection`. **Mitigation**: `effectiveType` falls back to `"unknown"` (Property 14 only triggers on `2g`/`slow-2g`, so Safari users get the full visual experience). Save-data path is unaffected.
5. **`useScroll` precision on iOS Safari** — Safari's rubber-band overscroll can produce `scrollYProgress` values briefly outside `[0, 1]`. **Mitigation**: clamp inside `useTransform` with `[0.001, 0.999]` input range and an explicit `clamp: true`.
6. **`motion.layoutId` and SSR** — `motion.layoutId` is a client-only feature. The `Project_Showcase` is already client-only (`AnimatePresence`), but the `Project_Card` is currently rendered server-side. **Mitigation**: keep the card's outer DOM SSR-rendered without the `motion.div` wrapper; hydrate the `motion` wrapper client-side only. No visual delta to first paint.
7. **`prefers-reduced-motion` flip while page is open** — If the user toggles the OS preference mid-session, components mounted before the change must reflect it. **Resolution**: `useReducedMotion` already subscribes to `change` events; Property 1's test fixture covers this transition explicitly.
8. **Palette persistence with multi-tab** — Two tabs writing different seeds to `localStorage` will conflict. **Resolution**: `useMaterialAccent` listens to `storage` events and re-applies on cross-tab change. Last-write-wins is acceptable.
9. **Component_Gallery scope creep** — The gallery could grow to mirror Material 3 in full. **Resolution**: cap MVP at the five primitives listed in §8 (FAB, switch, chip, button, snackbar). Anything more is a follow-up spec.
10. **`@paper-design/shaders-react` bundle size** — The shader library is heavyweight and only used in two places (avatar, hero halo). **Resolution**: dynamic-import both consumers; the library should never appear in the main JS chunk.

---

## Requirements Traceability

Each acceptance criterion maps to at least one design section (§§) and, where applicable, to a Correctness Property (P) and a test file. Sections are numbered by their headers above:

§A = Architecture · §C = Components and Interfaces (1–8) · §D = Data Models · §P = Performance · §X = Accessibility · §E = Error Handling · §T = Testing.

| Req  | Maps to                                            | Property |
| ---- | -------------------------------------------------- | -------- |
| 1.1  | §C.3 PhoneFrame, §C.1 motion presets               | —        |
| 1.2  | §C.1 spring-presets.ts                             | —        |
| 1.3  | §C.3 (status bar), §C.5 (transform), §C.8 (FAB)    | —        |
| 1.4  | §C.8 ripple, §T table                              | P10, P16 |
| 1.5  | §X coarse-pointer plan                             | P12      |
| 2.1  | §C.1 stagger, §T (`profile-section.test.tsx`)      | P17      |
| 2.2  | §T example                                         | —        |
| 2.3  | §C.2 `--accent-halo`                               | —        |
| 2.4  | §C.1 `motionSprings.responsive`                    | P12, P18 |
| 2.5  | §C.1 `motionDurations.counterMax`                  | P2       |
| 2.6  | §X reduced-motion plan                             | P1       |
| 3.1  | §C.4 Device_Showcase                               | —        |
| 3.2  | §C.4 useScroll mapping                             | P13      |
| 3.3  | §C.4 ShowcaseScreen.kicker                         | —        |
| 3.4  | §C.1 motion presets                                | —        |
| 3.5  | §C.4 variant transition + §C.1 emphasized          | —        |
| 3.6  | §C.4 click target                                  | —        |
| 3.7  | §C.4 mobile carousel                               | —        |
| 3.8  | §C.4 reduced-motion fallback                       | P1       |
| 3.9  | §P shader/asset deferral                           | —        |
| 4.1  | §C.3 PhoneFrame in projects-section                | —        |
| 4.2  | §D Project.device, §C.3 selector                   | —        |
| 4.3  | §C.3 selector default                              | P6       |
| 4.4  | §C.3 AndroidPhoneFrame chrome                      | —        |
| 4.5  | §C.5 / §C.1 responsive spring                      | P12      |
| 4.6  | §C.1                                               | —        |
| 4.7  | §C.5 affordance                                    | —        |
| 4.8  | §X coarse-pointer plan                             | P12      |
| 4.9  | §C.1 motionDurations.cardReveal                    | —        |
| 5.1  | §C.5 layoutId + §X keyboard parity                 | P3       |
| 5.2  | §C.5 abort/snap timer                              | P5       |
| 5.3  | §C.5 reverse + reduced-motion branch               | —        |
| 5.4  | §C.5 layoutId equality                             | P4       |
| 5.5  | §C.5 transitionLockRef                             | —        |
| 5.6  | §C.5 reduced-motion + focus mgmt                   | P1, P4   |
| 5.7  | §X focus-trap utility                              | P4       |
| 6.1  | §C.1 responsive spring + tech-icon hook            | P19      |
| 6.2  | §X tooltip clip safety                             | —        |
| 6.3  | §X focus-ring                                      | P8       |
| 6.4  | §C.1 stagger.techGrid                              | P17      |
| 6.5  | §X coarse-pointer plan                             | P12      |
| 6.6  | §X reduced-motion plan                             | P1       |
| 7.1  | §C.1 motionDurations.timelineRail                  | —        |
| 7.2  | §C.1                                               | —        |
| 7.3  | §D unchanged data shape                            | —        |
| 7.4  | §C.1 / §X                                          | —        |
| 7.5  | §X reduced-motion plan                             | P1       |
| 8.1  | §C.1 stagger.contact                               | —        |
| 8.2  | §C.1 motionDurations.formField                     | —        |
| 8.3  | §C.8 (MaterialButton) + §T                         | —        |
| 8.4  | §X validation focus                                | —        |
| 8.5  | §C.8 ripple                                        | P10      |
| 8.6  | §X reduced-motion plan                             | P1       |
| 9.1  | §C.6 SectionRail                                   | —        |
| 9.2  | §C.6 useScrollProgress                             | P20      |
| 9.3  | §C.1 motionSprings.rail                            | —        |
| 9.4  | §C.6 useActiveSection shared source                | P9       |
| 9.5  | §X reduced-motion plan                             | P1       |
| 9.6  | §C.6 mobile breakpoint                             | —        |
| 10.1 | §X typography tokens (globals.css)                 | —        |
| 10.2 | §X SectionLabel typography                         | —        |
| 10.3 | §X spacing rhythm                                  | —        |
| 10.4 | §X body line-length                                | —        |
| 10.5 | §X body line-height                                | —        |
| 11.1 | §C.2 seed palette table                            | —        |
| 11.2 | §C.2 PaletteSwatcher placement                     | —        |
| 11.3 | §C.2 setSeed CSS-var write                         | P15      |
| 11.4 | §C.2 localStorage persistence                      | P15      |
| 11.5 | §C.2 default seed                                  | —        |
| 11.6 | §C.2 swatch a11y + ripple                          | P7, P10  |
| 11.7 | §C.2 resolveFocusRing                              | P8       |
| 12.1 | §X color tokens                                    | —        |
| 12.2 | §X dark elevation ladder                           | —        |
| 12.3 | §A site-header (existing toggle preserved)         | —        |
| 12.4 | §X contrast tokens                                 | P21      |
| 12.5 | §C.1 motionDurations.themeCrossfade + §P CLS       | —        |
| 13.1 | §C.7 IntroOverlay preserved hook                   | —        |
| 13.2 | §C.7 IntroBoot timeline + 1800ms cap               | —        |
| 13.3 | §C.7 (existing skip behavior preserved)            | —        |
| 13.4 | §C.7 IntroGate intro-seen                          | —        |
| 13.5 | §C.7 reduced-motion 200ms handoff                  | P1       |
| 13.6 | §C.7 data-intro-active                             | —        |
| 14.1 | §A scroll-island-nav, §C.6 (no break)              | —        |
| 14.2 | §C.6 useScrollProgress                             | —        |
| 14.3 | §C.1 motionSprings.island                          | —        |
| 14.4 | §C.6 scroll-margin offset                          | —        |
| 14.5 | §X focus-on-heading after scroll                   | —        |
| 14.6 | §X focus-trap utility                              | P4       |
| 14.7 | §X reduced-motion plan                             | P1       |
| 15.1 | §X responsive layout                               | —        |
| 15.2 | §C.5 BottomSheet variant                           | —        |
| 15.3 | §C.4 mobile carousel                               | —        |
| 15.4 | §X 44×44 touch target                              | —        |
| 15.5 | §X coarse-pointer plan                             | P12      |
| 15.6 | §X 390×844 fitness                                 | —        |
| 16.1 | §P LCP plan                                        | —        |
| 16.2 | §P CLS plan                                        | —        |
| 16.3 | §P INP plan                                        | —        |
| 16.4 | §P shader deferral                                 | —        |
| 16.5 | §P / §C.4 lazy-loading                             | —        |
| 16.6 | §P slow-connection static fallback                 | P14      |
| 16.7 | §P responsive variants                             | —        |
| 17.1 | §C.1 useReducedMotion subscription                 | —        |
| 17.2 | §X reduced-motion final-state                      | P1       |
| 17.3 | §X tab order                                       | —        |
| 17.4 | §X focus-ring tokens                               | P8       |
| 17.5 | §X accessible-name guarantees                      | P7       |
| 17.6 | §X a11y tree preservation                          | —        |
| 17.7 | §X no color-only state                             | —        |
| 18.1 | §C.8 Component_Gallery primitives                  | —        |
| 18.2 | §C.8 #components anchor preserved                  | —        |
| 18.3 | §C.8 tech stack remains                            | —        |
| 18.4 | §C.8 shared motion/ripple                          | P10      |
| 18.5 | §X reduced-motion plan                             | P1       |
| 19.1 | §X reduced-motion plan                             | P1       |
| 19.2 | §C.1 counter cap                                   | P2       |
| 19.3 | §X keyboard parity                                 | P3       |
| 19.4 | §C.5 layoutId + focus restore                      | P4       |
| 19.5 | §C.6 useActiveSection shared source                | P9       |
| 19.6 | §X focus-trap utility                              | P4       |
| 19.7 | §X accessible-name guarantees                      | P7       |
| 19.8 | §C.3 deviceVariantSelector                         | P6       |
| 19.9 | §C.2 resolveFocusRing                              | P8       |
| 20.1 | §D portfolio-data unchanged                        | —        |
| 20.2 | §D additive optional fields                        | P11      |
| 20.3 | §C.7 hero-name hook preserved                      | —        |
| 20.4 | §A section ids preserved                           | —        |
