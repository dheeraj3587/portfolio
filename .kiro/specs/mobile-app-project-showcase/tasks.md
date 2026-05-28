# Implementation Plan: Mobile App Project Showcase (Lumen)

## Overview

Replace the existing `crm` project with the new **Lumen** mobile-app showcase: two interactive iPhone-frame screens (Home with an animated mp4 orb, Results with an inspiration row and concept-starter list) wired through a pure state machine and the existing `IPhoneFrame` / `ProjectShowcase` chrome.

The plan follows the **9-step migration order** from the design doc so the working tree stays compilable at every step:

1. Stage assets in `public/`.
2. Add pure helpers (`lumen-machine.ts`, `lumen-data.ts`, `use-reduced-motion.ts`) — testable in isolation.
3. Build the React components (provider, input bar, home, results, hero orb).
4. Add the Lumen project entry to `portfolio-data.ts` (CRM still present).
5. Migrate the registry to the new `{ screens, autoAdvance }` envelope (CRM still present).
6. Update `ProjectShowcase` to read the new shape and conditionally suppress its carousel.
7. Update existing tests to cover Lumen alongside CRM (transitional state, both projects pass).
8. Coordinated CRM cleanup: project entry, registry key, `crm-screens.tsx`, test rows, `"Built Lead CRM"`, legacy `src/assets/*.mp4`.
9. Final verification: `npm run build`, `npm test`, `npx eslint`, and `grep -rn "crm" src/` returns zero matches.

Property tests use **fast-check v4** (already a devDependency). Each property test is tagged with the comment `// Feature: mobile-app-project-showcase, Property N: <text>` and runs `{ numRuns: 100 }` iterations. Each property is its own sub-task and is collocated with the implementation it validates.

## Tasks

- [x] 1. Stage video and image assets under `public/`
  - [x] 1.1 Copy mp4 video assets to `public/videos/`
    - Copy `src/assets/original-5728764a89b91a8c9a43356a1fd993a1.mp4` → `public/videos/lumen-orb-a.mp4`
    - Copy `src/assets/original-5c02a7f9fbc7d094fe648f0afc795028.mp4` → `public/videos/lumen-orb-b.mp4`
    - Do **not** delete the originals yet; the legacy files in `src/assets/` are removed in task 10.7 after all new wiring is in place.
    - Both files must be tracked by git (verify they are not under any `.gitignore` rule for binary assets).
    - _Requirements: 3.4, 7.1, 7.2, 7.5_
  - [x] 1.2 Add placeholder inspiration card images
    - Create directory `public/images/projects/lumen/`.
    - Commit at least 4 placeholder webp files: `insp-01.webp`, `insp-02.webp`, `insp-03.webp`, `insp-04.webp`.
    - These are temporary stand-ins (any portrait-orientation webp will do until real assets are produced); a 5th `insp-05.webp` is optional for visual density.
    - File contents do not affect tests (jsdom does not decode images), but each file MUST exist on disk so `next/image` does not 404 in dev/build.
    - _Requirements: 4.4_

- [x] 2. Implement the pure Lumen state machine and data module
  - [x] 2.1 Create `lumen-machine.ts` reducer + types
    - File: `src/components/portfolio/phone-screens/lumen-screens/lumen-machine.ts`.
    - Export `LumenPhase`, `LumenState`, `LumenEvent`, `initialLumenState`, `lumenReducer`, `isInputSubmittable`, and `DEFAULT_PROMPT = "Inspiration for motion fashion photography"`.
    - Reducer MUST be **total** (every (state, event) pair returns a valid `LumenState`), **pure** (no `Date.now`, no `Math.random`, no I/O), and **idempotent on no-ops** (return the same reference when nothing changes so `useReducer` skips re-renders).
    - Implement the transition table in the design doc verbatim, including the `hasAdvancedFromHome` guard on `AUTO_ADVANCE` and the trim-based empty-input guard on `SUBMIT`.
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 3.7_

  - [x] 2.2* Property 5 test: `lumenReducer` is total
    - File: `src/components/portfolio/phone-screens/lumen-screens/lumen-machine.test.ts`.
    - Tag: `// Feature: mobile-app-project-showcase, Property 5: lumenReducer is total`.
    - Use fast-check to generate arbitrary `LumenState` values (build via random sequences from `initialLumenState`) and arbitrary `LumenEvent` values, then assert `lumenReducer(state, event)` returns a state whose `phase` ∈ `{idle, composing, loading, results}` and whose other fields satisfy their declared types. Reducer MUST never throw and never return `undefined`.
    - `{ numRuns: 100 }`.
    - _Validates: Requirements 5.3, 5.4, 5.6_

  - [x] 2.3* Property 6 test: SUBMIT with non-empty input advances to `results` carrying the trimmed prompt
    - File: `src/components/portfolio/phone-screens/lumen-screens/lumen-machine.test.ts`.
    - Tag: `// Feature: mobile-app-project-showcase, Property 6: SUBMIT with non-empty input advances to results carrying the trimmed prompt`.
    - For all strings `s` where `s.trim().length > 0`, the sequence `TYPE(s) → SUBMIT → LOAD_COMPLETE` from `initialLumenState` ends in `phase === "results"`, `submittedPrompt === s.trim()`, `hasAdvancedFromHome === true`. Also assert the intermediate state after `SUBMIT` has `phase === "loading"`.
    - `{ numRuns: 100 }`.
    - _Validates: Requirements 5.3, 5.4, 4.2_

  - [x] 2.4* Property 7 test: Empty or whitespace-only input never advances the phase
    - File: `src/components/portfolio/phone-screens/lumen-screens/lumen-machine.test.ts`.
    - Tag: `// Feature: mobile-app-project-showcase, Property 7: Empty or whitespace-only input never advances the phase`.
    - Generator: whitespace-only via `fc.string({ unit: fc.constantFrom(" ", "\t", "\n", "") })`.
    - For all such `s` and all reachable states, `TYPE(s) → SUBMIT` returns a state with `phase ∈ {idle, results}` (never `loading`) and `submittedPrompt` unchanged.
    - `{ numRuns: 100 }`.
    - _Validates: Requirements 5.6_

  - [x] 2.5* Property 9 test: AUTO_ADVANCE fires at most once and is suppressed by prior submit
    - File: `src/components/portfolio/phone-screens/lumen-screens/lumen-machine.test.ts`.
    - Tag: `// Feature: mobile-app-project-showcase, Property 9: AUTO_ADVANCE fires at most once and is suppressed by prior submit`.
    - From `initialLumenState`, dispatching `AUTO_ADVANCE` once transitions `phase` from `idle` to `loading` and sets `hasAdvancedFromHome = true`; any subsequent `AUTO_ADVANCE` is a no-op (state reference equality preserved). If a non-empty `SUBMIT` precedes `AUTO_ADVANCE`, the later `AUTO_ADVANCE` is also a no-op.
    - `{ numRuns: 100 }`.
    - _Validates: Requirements 3.7_

  - [x] 2.6 Create `lumen-data.ts` constants module
    - File: `src/components/portfolio/phone-screens/lumen-screens/lumen-data.ts`.
    - Export `conceptStarters` (≥ 4 entries; first three MUST be `Velocity Veil`, `Skate-Tailored`, `Rain Room Glam` in that order).
    - Export `inspirationCards` (≥ 4 entries) referencing `/images/projects/lumen/insp-NN.webp` paths from task 1.2.
    - Export `heroOrbVideoSources = ["/videos/lumen-orb-a.mp4", "/videos/lumen-orb-b.mp4"] as const` and `HERO_ORB_PRIMARY = heroOrbVideoSources[0]`.
    - Export `TIMING = { AUTO_ADVANCE_MIN_MS: 2000, AUTO_ADVANCE_MAX_MS: 3000, LOADING_MIN_MS: 400, LOADING_MAX_MS: 1500, SEND_PRESS_MS: 200 } as const`.
    - _Requirements: 4.4, 4.5, 3.7, 5.5, 5.7_

  - [x] 2.7 Create `use-reduced-motion.ts` hook
    - File: `src/components/portfolio/phone-screens/lumen-screens/use-reduced-motion.ts`.
    - SSR-safe: guard on `typeof window === "undefined"` and default to `false`; subscribe in a `useEffect` to `window.matchMedia("(prefers-reduced-motion: reduce)")` with `addEventListener("change", handler)` and return the live value.
    - First server + client render must match (`false`) to avoid hydration warnings.
    - _Requirements: 3.5, 3.6_

- [x] 3. Build the Lumen React UI components
  - [x] 3.1 Create `input-bar.tsx`
    - File: `src/components/portfolio/phone-screens/lumen-screens/input-bar.tsx`.
    - Renders a `<form>` whose `onSubmit` calls `event.preventDefault()` and the context's `submit()`. Pressing Enter inside the input naturally submits.
    - `<input type="text" placeholder="Ask anything..." aria-label="Ask anything" />` reads `state.input` and calls `setInput(value)` from `useLumen()`.
    - `<button type="submit" aria-label="Send">` containing the purple-orb send glyph; uses Framer Motion `whileTap={{ scale: 0.92 }}` with duration ≤ `TIMING.SEND_PRESS_MS` (200ms).
    - DOM order: input first, button second (Tab order is enforced by source order; do NOT set `tabIndex`).
    - Focus ring on the wrapper via `:focus-within` so the entire glass pill highlights when either child is focused.
    - The button is **not** `disabled` when input is empty — submission is no-op'd by the reducer guard so the button stays focusable.
    - _Requirements: 5.1, 5.2, 5.4, 5.7, 8.1, 8.2, 8.4_

  - [x] 3.2 Create `lumen-context.tsx` (LumenProvider + useLumen)
    - File: `src/components/portfolio/phone-screens/lumen-screens/lumen-context.tsx`.
    - Internal: `useReducer(lumenReducer, initialLumenState)`.
    - Props: `screenIndex`, `setScreenIndex`, optional `randomSource?: () => number` (defaults `Math.random`), optional `scheduler?: { setTimeout, clearTimeout }` (defaults to `window.*`) for test seams.
    - On mount, schedule a one-shot `setTimeout(() => dispatch({ type: "AUTO_ADVANCE" }), randIn(TIMING.AUTO_ADVANCE_MIN_MS, TIMING.AUTO_ADVANCE_MAX_MS))`. Store the id in a ref; clear in cleanup.
    - On entering `phase === "loading"`, schedule `setTimeout(() => dispatch({ type: "LOAD_COMPLETE" }), randIn(TIMING.LOADING_MIN_MS, TIMING.LOADING_MAX_MS))`. Clear on phase change or unmount.
    - **Bidirectional carousel sync**:
      1. When `state.phase` changes, derive desired `screenIndex` (`results` → 1, else → 0) and call `setScreenIndex` if it differs.
      2. When the parent flips `screenIndex` via Arrow keys, observe the change and dispatch `NAV_TO_HOME` / `NAV_TO_RESULTS` so the reducer tracks the carousel.
    - Export `useLumen()` hook with a clear "must be used inside `<LumenProvider>`" error.
    - _Requirements: 3.7, 5.3, 5.4, 5.5, 8.5, 8.6_

  - [x] 3.3 Create `lumen-home-screen.tsx` with `HeroOrb`
    - File: `src/components/portfolio/phone-screens/lumen-screens/lumen-home-screen.tsx`.
    - Root container: `style={{ background: "var(--device-screen-bg, #f8f6f2)" }}`. Do NOT set the background via Tailwind class (registry test asserts the exact literal).
    - Layout: greeting `Hey Martin,` (warm-grey), heading `What can I help with?` (serif, large, dark), centred `<HeroOrb />` (only when `phase !== "results"`), bottom-pinned `<InputBar />` above the IPhoneFrame home-indicator safe area. The screen MUST NOT render any status bar, Dynamic Island, side buttons, or home-indicator graphics.
    - `HeroOrb` (component defined in this file or extracted next to it):
      - Calls `useReducedMotion()`. When reduced: render an `<img>` poster fallback (or a paused first-frame). When not reduced: render `<video muted autoPlay loop playsInline preload="metadata" aria-hidden="true">` with `<source src={HERO_ORB_PRIMARY} type="video/mp4" />`.
      - On unmount, `useLayoutEffect` cleanup calls `videoRef.current?.pause()` synchronously **before** the DOM node detaches (Req 7.3).
      - On `<video onError>`, swap to the static poster fallback.
    - When `phase === "loading"`, overlay a small loading indicator (translucent backdrop + shimmer dot trio) over the orb area.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 3.9, 5.5, 6.1, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5, 8.3_

  - [x] 3.4 Create `lumen-results-screen.tsx`
    - File: `src/components/portfolio/phone-screens/lumen-screens/lumen-results-screen.tsx`.
    - Root container: `style={{ background: "var(--device-screen-bg, #f8f6f2)" }}` (Req 6.2 — exact literal).
    - Layout (top → bottom): `<PromptChip>` showing `state.submittedPrompt ?? DEFAULT_PROMPT`; the label `Created in 5 seconds` (uppercase tracked, muted); `<InspirationRow>` (horizontal `overflow-x-auto`, scroll-snap, ≥ 4 cards from `inspirationCards`); `<ConceptStarterList>` numbered list rendering `conceptStarters` (`Velocity Veil`, `Skate-Tailored`, `Rain Room Glam`, plus the 4th); bottom-pinned `<InputBar />`.
    - Middle scroll region (chip → input bar): `flex-1 overflow-y-auto` so the concept list scrolls while the chip and input bar stay pinned.
    - Inspiration cards rendered with `next/image` using `fill` + `sizes="132px"` + `object-cover` inside `width: 132; aspectRatio: "3 / 4"` containers; row container has `-mx-4 px-4` bleed and `scroll-snap-type: x mandatory`.
    - Screen MUST NOT render any status bar, Dynamic Island, side buttons, or home-indicator graphics.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 6.2, 6.4_

  - [x] 3.5 Create `lumen-screens/index.tsx` barrel
    - File: `src/components/portfolio/phone-screens/lumen-screens/index.tsx`.
    - Re-export `LumenHomeScreen`, `LumenResultsScreen`, `LumenProvider`, `useLumen` so the parent registry imports a single module path.
    - This is the "public surface" the registry will consume; nothing else outside this directory should import from `./lumen-screens/lumen-home-screen` etc. directly.
    - _Requirements: 2.4_

  - [x] 3.6* Render and accessibility tests for Lumen screens
    - File: `src/components/portfolio/phone-screens/lumen-screens/lumen-screens.test.tsx`.
    - Render `<LumenHomeScreen />` and `<LumenResultsScreen />` inside a controlled `<LumenProvider />` with a deterministic `randomSource` and a fake `scheduler`, and assert:
      - Home renders the literal text `Hey Martin,` and `What can I help with?` (Req 3.2).
      - Results renders the prompt chip text `Inspiration for motion fashion photography` (Req 4.2), `Created in 5 seconds` (Req 4.3), and ordered list items including `Velocity Veil`, `Skate-Tailored`, `Rain Room Glam` plus a 4th (Req 4.5).
      - The input has `aria-label="Ask anything"` (Req 8.1) and the send button has `aria-label="Send"` (Req 8.2).
      - The Hero `<video>` element has `muted`, `autoPlay`, `loop`, `playsInline`, `preload="metadata"`, and `aria-hidden="true"` (Req 3.4, 7.5, 8.3).
      - When `useReducedMotion` is forced to `true` via a test seam, the `<video>` is replaced by the `<img>` fallback (Req 3.6).
      - Pressing `Tab` on Home moves focus to the input first, then to the send button on the next `Tab` (Req 8.4).
      - Tapping send with non-empty input applies a press animation that completes within 250ms (Req 5.7).
    - _Requirements: 3.2, 3.4, 3.6, 4.2, 4.3, 4.5, 5.1, 5.7, 7.5, 8.1, 8.2, 8.3, 8.4_

  - [x] 3.7* Property 8 test: HeroOrb is mounted iff `phase !== "results"`
    - File: `src/components/portfolio/phone-screens/lumen-screens/lumen-screens.test.tsx`.
    - Tag: `// Feature: mobile-app-project-showcase, Property 8: HeroOrb is mounted iff phase !== results`.
    - Iterate over the four phases (`idle`, `composing`, `loading`, `results`); for each, render `<LumenHomeScreen />` inside a `<LumenProvider>` whose state is parameterised to that phase, then assert `container.querySelectorAll("video").length === (phase === "results" ? 0 : 1)`. Also assert that on transition from a non-results phase to `results`, `videoRef.pause()` is observed before the video element is removed (use a spy via `useReducedMotion` seam or a ref-attaching wrapper).
    - `{ numRuns: 100 }` over phase permutations and reduced-motion combinations.
    - _Validates: Requirements 7.1, 7.3, 7.4_

- [x] 4. Checkpoint - Verify pure helpers and components compile and unit tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add the Lumen project entry to portfolio data
  - [x] 5.1 Append `ai` tech entry to `projectOnlyTech`
    - File: `src/lib/portfolio-data.ts`.
    - Append `{ id: "ai", name: "AI", src: "/icons/tech/ai.svg" }` to the `projectOnlyTech` array (the icon already exists in `public/icons/tech/ai.svg`).
    - This guarantees `techById.get("ai")` resolves for the new project's stack.
    - _Requirements: 1.5_

  - [x] 5.2 Add the Lumen project entry to the `projects` array
    - File: `src/lib/portfolio-data.ts`.
    - Append a new entry alongside (NOT replacing — the CRM entry stays until task 10.1):
      ```ts
      {
        id: "lumen",
        title: "Lumen",
        subtitle: "AI Creative Assistant",
        description: "Concept ideation for fashion and motion photographers — generate moodboards, hooks, and shot lists from a one-line prompt. Designed in iOS-native idiom with a custom liquid-metal hero animation.",
        image: "/images/projects/preview_2.webp", // placeholder until a real cover is delivered
        links: { github: "https://github.com/dheeraj3587/lumen" },
        stack: ["typescript", "react", "ai", "figma"],
      }
      ```
    - Stack ids must all resolve via `techById` (verified by Property 2 in task 6.3).
    - _Requirements: 1.1, 1.4_

- [x] 6. Migrate the phone-screens registry shape and add invariant tests
  - [x] 6.1 Update `phoneScreensByProject` to the `{ screens, autoAdvance }` envelope and add the Lumen entry
    - File: `src/components/portfolio/phone-screens/index.tsx`.
    - Add a new exported type:
      ```ts
      export type PhoneScreenProjectEntry = {
        screens: PhoneScreen[];
        autoAdvance: { enabled: boolean; intervalMs: number };
      };
      ```
    - Change the registry type to `Record<string, PhoneScreenProjectEntry>`.
    - Wrap the existing `chime` value in `{ screens: [...existing three screens unchanged...], autoAdvance: { enabled: true, intervalMs: 4500 } }` so its current behaviour is byte-identical.
    - Wrap the existing `crm` value in the same envelope (CRM stays for now; it is removed in task 10.2).
    - Add a new `lumen` key:
      ```ts
      lumen: {
        screens: [
          { id: "home", label: "Home", Component: LumenHomeScreen, screenBackground: "#f8f6f2" },
          { id: "results", label: "Results", Component: LumenResultsScreen, screenBackground: "#f8f6f2" },
        ],
        autoAdvance: { enabled: false, intervalMs: 0 },
      }
      ```
    - Import `LumenHomeScreen` and `LumenResultsScreen` from `./lumen-screens` (the barrel created in 3.5).
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 6.2* Property 1 test: project identifier invariants
    - File: `src/components/portfolio/phone-screens/lumen-screens/registry.test.ts`.
    - Tag: `// Feature: mobile-app-project-showcase, Property 1: Project identifier invariants`.
    - Assert: there exists exactly one project with `id === "lumen"` in `projects`; `id !== "crm"` for every entry; all `id` values are pairwise distinct.
    - Note: this property must hold from task 10.1 onwards (after CRM removal). For now (after task 6.1), the CRM-absent assertion is *expected to fail* — guard the `id !== "crm"` assertion with a `// will pass after task 10.1` comment OR write the test now and accept that it will go green only after CRM removal. Recommended: write the test now; mark the file with a leading `describe.skip` block until task 10.1 lands, then flip to `describe` in task 10.1's diff.
    - `{ numRuns: 100 }` (where applicable; identifier invariants may use a single deterministic assertion plus shrinking over candidate ids if useful).
    - _Validates: Requirements 1.1, 1.2, 1.6_

  - [x] 6.3* Property 2 test: every stack identifier resolves via `techById`
    - File: `src/components/portfolio/phone-screens/lumen-screens/registry.test.ts`.
    - Tag: `// Feature: mobile-app-project-showcase, Property 2: Stack identifiers resolve via techById`.
    - For every project in `projects`, for every `id` in `project.stack`, `techById.get(id)` returns a defined `TechItem`. This must pass immediately after task 5.1 + 5.2.
    - `{ numRuns: 100 }` (iterating over the cartesian product of generated indices into `projects` and `stack`).
    - _Validates: Requirements 1.4, 1.5_

  - [x] 6.4* Property 3 test: every registered screen consumes `var(--device-screen-bg, <fallback>)`
    - File: `src/components/portfolio/phone-screens/lumen-screens/registry.test.ts`.
    - Tag: `// Feature: mobile-app-project-showcase, Property 3: Every registered screen consumes the --device-screen-bg convention`.
    - For every entry in `phoneScreensByProject`, for every `screen` in `entry.screens`:
      1. `tryParseHexOrRgb(screen.screenBackground)` returns non-null.
      2. Rendering `<screen.Component />` produces a root element whose inline `style.background === "var(--device-screen-bg, " + screen.screenBackground + ")"`.
    - `{ numRuns: 100 }` (iterate over all screens; if there are fewer than 100 screens, fast-check will exhaustively cycle them).
    - _Validates: Requirements 2.5, 3.1, 4.1, 6.1, 6.2_

  - [x] 6.5* Property 4 test: Lumen screens render no device chrome
    - File: `src/components/portfolio/phone-screens/lumen-screens/registry.test.ts`.
    - Tag: `// Feature: mobile-app-project-showcase, Property 4: Screens render no device chrome`.
    - For each Lumen screen rendered **outside** `IPhoneFrame`, assert the rendered DOM contains zero elements matching `[data-iphone-button]`, zero elements matching `[data-device-screen]`, no SVGs structurally identical to `SignalGlyph`/`WifiGlyph`/`BatteryGlyph`, and no element styled as the home-indicator pill (width ≈ 32%, border-radius 999, near-bottom positioning).
    - `{ numRuns: 100 }`.
    - _Validates: Requirements 3.9, 4.8_

- [x] 7. Wire `ProjectShowcase` to the new registry shape and the Lumen state context
  - [x] 7.1 Read `entry.screens` and conditionally suppress the auto-advance carousel
    - File: `src/components/portfolio/project-showcase.tsx`.
    - Change `const screens = phoneScreensByProject[project.id] ?? []` to read from the new envelope: `const entry = phoneScreensByProject[project.id]; const screens = entry?.screens ?? [];`.
    - Update the existing 4500ms `setInterval` carousel `useEffect` to early-return when `entry?.autoAdvance.enabled === false`. Use `entry?.autoAdvance.intervalMs ?? 4500` as the interval when enabled.
    - Keep keyboard handling (Esc / ArrowLeft / ArrowRight) untouched.
    - _Requirements: 2.1, 3.7, 8.5, 8.6_

  - [x] 7.2 Wrap the active screen in `LumenProvider` when the project is Lumen
    - File: `src/components/portfolio/project-showcase.tsx`.
    - When `project.id === "lumen"`, wrap the `<ActiveScreen />` render (inside the `<AnimatePresence>`) in `<LumenProvider screenIndex={screenIndex} setScreenIndex={setScreenIndex}>...</LumenProvider>`.
    - For other project ids, the wrapper is omitted (Chime stays unchanged).
    - The `LumenProvider` uses the `screenIndex` / `setScreenIndex` props for bidirectional carousel sync; the existing `ProjectShowcase` `screenIndex` state is the single source of truth.
    - _Requirements: 3.7, 5.3, 5.4, 5.5, 8.5, 8.6_

- [x] 8. Update existing tests to cover Lumen alongside CRM (transitional)
  - [x] 8.1 Add Lumen rows to `screens.test.tsx`
    - File: `src/components/portfolio/phone-screens/screens.test.tsx`.
    - **Keep** the existing `ChimeInbox`, `ChimeChat`, `ChimeCompose`, `CrmDashboard`, `CrmPipeline`, `CrmLead` rows (CRM rows are removed in task 10.4 once CRM is fully gone).
    - Import `LumenHomeScreen` and `LumenResultsScreen` from `./lumen-screens`.
    - Add two new rows asserting `style.background === "var(--device-screen-bg, #f8f6f2)"` for both Lumen screens.
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 8.2 Add a Lumen case to `project-showcase.test.tsx`
    - File: `src/components/portfolio/project-showcase.test.tsx`.
    - **Keep** the existing `chime` and `crm` cases (the `crm` case is removed in task 10.5).
    - Add `{ projectId: "lumen" as const }`. The existing assertion (active screen's `screenBackground` is propagated to `[data-device-screen]`'s `--device-screen-bg`) must pass for Lumen because Property 3 already guarantees the correct registry shape.
    - Update the test's reads of `phoneScreensByProject[projectId]` from `screens[0]` to `entry?.screens[0]` to match the new registry shape.
    - _Requirements: 6.5, 6.6_

- [x] 9. Checkpoint - Ensure all tests pass before CRM removal
  - Ensure all tests pass, ask the user if questions arise.
  - At this point both `crm` and `lumen` projects render correctly; the migration is reversible.

- [x] 10. Coordinated CRM removal cleanup
  - [x] 10.1 Remove the `crm` project entry from `portfolio-data.ts`
    - File: `src/lib/portfolio-data.ts`.
    - Delete the `{ id: "crm", title: "Lead Management CRM", ... }` object from the `projects` array.
    - Leave the rest of the file (including the new `ai` entry from 5.1 and the new `lumen` entry from 5.2) untouched.
    - _Requirements: 1.2, 1.6_

  - [x] 10.2 Remove the `crm` key from `phoneScreensByProject`
    - File: `src/components/portfolio/phone-screens/index.tsx`.
    - Delete the `crm: { screens: [...], autoAdvance: ... }` entry.
    - Delete the now-unused `import { CrmDashboard, CrmLead, CrmPipeline } from "./crm-screens";` line.
    - _Requirements: 2.2_

  - [x] 10.3 Delete `crm-screens.tsx`
    - Delete the file `src/components/portfolio/phone-screens/crm-screens.tsx`.
    - Order matters: this MUST run after 10.2 so the registry no longer imports from it. The dependency graph schedules 10.3 in a wave strictly after 10.2.
    - _Requirements: 10.1, 10.3_

  - [x] 10.4 Remove CRM imports and rows from `screens.test.tsx`
    - File: `src/components/portfolio/phone-screens/screens.test.tsx`.
    - Delete the `import { CrmDashboard, CrmLead, CrmPipeline } from "./crm-screens";` line.
    - Remove the three `CrmDashboard`, `CrmPipeline`, `CrmLead` rows from the `cases` array.
    - Keep the Chime and Lumen rows.
    - _Requirements: 9.1_

  - [x] 10.5 Remove the `crm` case from `project-showcase.test.tsx`
    - File: `src/components/portfolio/project-showcase.test.tsx`.
    - Delete `{ projectId: "crm" as const }` from the `cases` array.
    - Keep the `chime` and `lumen` cases.
    - _Requirements: 1.6_

  - [x] 10.6 Replace `"Built Lead CRM"` in `intro-data.ts`
    - File: `src/components/portfolio/intro-data.ts`.
    - Locate the `{ text: "Built Lead CRM", pos: "pos-3", altPos: "pos-8" }` item inside the scroll-text group containing `Built Chime` / `Built SplitRight`.
    - Replace `"Built Lead CRM"` with `"Built Lumen"` (preserve `pos`, `altPos`, and any other fields).
    - This is the last user-visible CRM string per Req 1.6.
    - _Requirements: 1.6_

  - [x] 10.7 Delete the legacy mp4 files in `src/assets/`
    - Delete `src/assets/original-5728764a89b91a8c9a43356a1fd993a1.mp4`.
    - Delete `src/assets/original-5c02a7f9fbc7d094fe648f0afc795028.mp4`.
    - The copies under `public/videos/` (created in task 1.1) are the authoritative sources from this point on.
    - _Requirements: 1.6_

- [x] 11. Final verification checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Run the following commands and confirm each is clean:
    - `npm run build` — must succeed with no module-not-found errors referencing `crm-screens` (Req 10.3).
    - `npm test` — full Vitest suite passes, including the new `lumen-machine.test.ts`, `registry.test.ts`, and `lumen-screens.test.tsx` (Req 9.4).
    - `npx eslint` — no new lint errors introduced.
    - `grep -rn "crm" src/` — must return zero matches anywhere under `src/` (Req 1.6, 10.2). Matches inside `.kiro/specs/mobile-app-project-showcase/` are out of scope and acceptable.
  - If any step fails, fix the underlying issue before considering the spec complete.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. Property tests (2.2-2.5, 3.7, 6.2-6.5) and component render tests (3.6) all carry the `*` marker.
- Each task references specific requirement clauses for traceability; the `_Validates:_` annotation on property tests is the formal mapping from property → requirement.
- Checkpoints at tasks 4, 9, and 11 ensure incremental validation: pure helpers are testable before any UI exists, the migration is reversible until CRM removal, and the final checkpoint enforces the global invariants.
- Property tests use **fast-check v4** with `{ numRuns: 100 }` and the comment tag `// Feature: mobile-app-project-showcase, Property N: <text>` so they are discoverable by future tooling.
- The 9-step migration order from the design doc is preserved: (1) assets, (2) pure helpers, (3) components, (4) data entry, (5) registry, (6) showcase wiring, (7) test updates, (8) CRM cleanup, (9) verification.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "2.6", "2.7", "5.1"] },
    { "id": 1, "tasks": ["2.2", "3.2", "5.2"] },
    { "id": 2, "tasks": ["2.3", "3.1"] },
    { "id": 3, "tasks": ["2.4", "3.3", "3.4"] },
    { "id": 4, "tasks": ["2.5", "3.5"] },
    { "id": 5, "tasks": ["3.6", "6.1"] },
    { "id": 6, "tasks": ["3.7", "6.2", "7.1", "8.1"] },
    { "id": 7, "tasks": ["6.3", "7.2", "8.2"] },
    { "id": 8, "tasks": ["6.4"] },
    { "id": 9, "tasks": ["6.5"] },
    { "id": 10, "tasks": ["10.1", "10.2", "10.4", "10.5", "10.6", "10.7"] },
    { "id": 11, "tasks": ["10.3"] }
  ]
}
```
