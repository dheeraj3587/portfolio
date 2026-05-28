# Requirements Document

## Introduction

This feature is a visual and motion overhaul of Dheeraj's portfolio to make it
unmistakably read as the work of a modern Android / mobile developer. The
redesign keeps the existing data shape (profile, projects, experience,
contact) but re-skins and re-animates every section so the motion language,
typography, device-framing, and micro-interactions evoke Jetpack Compose,
Android 16-class system UI, and Material 3 Expressive.

The existing animation tooling (`motion`/Framer Motion v12, `gsap` 3.15,
`@paper-design/shaders-react`) is reused — no new animation framework is
introduced. Performance, accessibility, and a first-class touch / mobile
experience are explicit requirements rather than afterthoughts.

The overhaul targets three distinct visitors, in priority order:

- **Android peer (P)** — *primary*. Evaluates taste, motion choices, and idiomatic mobile-design literacy. The redesign is optimized so the showpiece moments (scroll-driven device showcase, container-transform project open, Material-style ripples) read as deliberate Android craft to this visitor.
- **Recruiter (R)** — *secondary*. Has under 30 seconds and must instantly read "mobile / Android engineer" and form a positive impression of craft.
- **Constrained visitor (C)** — on a slow phone, low-end network, or with `prefers-reduced-motion: reduce` set. Must not be excluded.

## Glossary

- **Portfolio_Site**: The top-level Next.js application rooted at `src/app/page.tsx`.
- **Motion_Engine**: The internal abstraction (built on `motion` and `gsap`) responsible for resolving every animation against `prefers-reduced-motion`, viewport visibility, and device capability.
- **Hero_Section**: The above-the-fold profile/identity area implemented in `src/components/portfolio/profile-section.tsx`.
- **Device_Showcase**: A new, signature scroll-driven device frame between the hero and the projects grid that scrubs through real screens of Dheeraj's apps as the user scrolls.
- **Phone_Frame**: A reusable device-bezel component that wraps app screen artwork with system-bar chrome. The `Phone_Frame` SHALL render in one of two visual variants: an `Android_Phone_Frame` (modern Pixel-class device with Android 16-style system bars) or an `iPhone_Frame` (the existing iOS device frame). The variant for any given usage is determined per-project via the `Device_Variant_Selector`.
- **Android_Phone_Frame**: The Android variant of `Phone_Frame`, modeled on a current Pixel-class bezel with Android 16-style status bar chrome (time, signal, battery, indicator pill) and a modern gesture-bar bottom inset.
- **iPhone_Frame**: The existing iOS device frame component (`src/components/ui/iphone-frame.tsx`), retained for compatibility and per-project use.
- **Device_Variant_Selector**: A pure function that, given a project record, returns the device variant (`android` or `ios`) used for that project's `Phone_Frame`. It SHALL default to `android` when a project does not declare a variant.
- **Project_Card**: A single card in the Featured Projects grid (`projects-section.tsx`).
- **Project_Showcase**: The full-screen modal that opens from a `Project_Card` (`project-showcase.tsx`).
- **Container_Transform**: A Compose-style shared-element morph in which a source element (e.g. a `Project_Card`) visually expands into a destination surface (the `Project_Showcase`) instead of cross-fading.
- **Tech_Stack_Grid**: The wrap-flow of technology icons rendered by `tech-icon.tsx` inside the profile section.
- **Component_Gallery**: An optional, additive section that demonstrates Material 3 Expressive UI primitives (FAB, switch, chip, ripple, snackbar) as a live craft showcase. Mounted at the existing `#components` anchor without breaking it.
- **Experience_Timeline**: The vertical timeline list of work entries (`experience-section.tsx`).
- **Contact_Section**: The "Get in Touch" + message form pair (`contact-section.tsx`).
- **Site_Footer**: The closing quote + links region (`site-footer.tsx`).
- **Intro_Overlay**: The pre-portfolio scroll-driven intro with the GSAP FLIP morph from "DHEERAJ" to the hero name (`intro-overlay.tsx`).
- **Scroll_Island_Nav**: The floating Dynamic Island-style navigation with section index and scroll-progress percentage (`scroll-island-nav.tsx`).
- **Section_Rail**: A new continuous, animated thin rail that visually links sections to provide a single coherent motion thread across the page.
- **Material_Accent**: A theme-aware accent color sourced from a fixed seed palette of three to five Material You-inspired hues. Applied to focus rings, ripple colors, and hero halo gradient stops.
- **Palette_Swatcher**: A Material You-style wallpaper picker control that lets the visitor flip the active `Material_Accent` between the seeds in the palette and persists the selection across reloads.
- **Reduced_Motion_State**: The state in which the user's OS reports `prefers-reduced-motion: reduce`, or in which the `Motion_Engine` has detected a low-end device and downgraded animation richness.
- **Touch_Pointer_State**: The state in which the primary input modality is touch (matched via `pointer: coarse`).
- **Animated_Counter**: Any numeric value (e.g. "500+ DSA solved", scroll progress) that animates from a start value to a target value.
- **Magnetic_Hover**: A hover interaction in which an element subtly translates toward the cursor and returns on exit, used on tech icons and primary CTAs.
- **App_Boot_Animation**: An Android-flavored boot sequence inside the `Intro_Overlay` (Android 16-style status-bar reveal and centered logo) that morphs into the portfolio.

## Requirements

### Requirement 1: Mobile-Developer Visual Identity

**User Story:** As an Android peer (P), I want the portfolio to instantly read as the work of a modern Android engineer, so that I form an accurate first impression of Dheeraj's specialty within the first viewport.

#### Acceptance Criteria

1. WHEN the `Hero_Section` first paints on a viewport at least 768px wide, THE `Portfolio_Site` SHALL render at least one `Phone_Frame` element within the initial above-the-fold area.
2. THE `Portfolio_Site` SHALL apply a single coherent motion language across `Hero_Section`, `Projects`, `Experience_Timeline`, and `Contact_Section`, defined by a shared spring-curve preset whose stiffness, damping, and mass values are exported from one module and consumed by every animated component.
3. THE `Portfolio_Site` SHALL surface at least three identifiably mobile-native UI motifs from the following set across the visible page: Android 16-style status-bar chrome, Material ripple-on-press, container-transform, bottom-sheet behavior, FAB-style floating action.
4. WHEN any primary interactive surface (`Project_Card`, primary CTA in `Contact_Section`, `Tech_Stack_Grid` icon, `Scroll_Island_Nav` action, `Palette_Swatcher` swatch) is pressed via mouse or touch, THE `Portfolio_Site` SHALL render a Material-style ripple that originates from the press coordinates and decays within 600ms, except WHERE the user's connection is reported as `2g` or `3g` via `navigator.connection.effectiveType`, in which case the ripple SHALL decay within 800ms.
5. WHERE the user's pointer is `coarse` (touch), THE `Portfolio_Site` SHALL substitute press feedback for hover-only effects so that no interaction depends on hover to reveal critical content.

### Requirement 2: Hero Section Motion and Identity

**User Story:** As an Android peer (P), I want the hero to communicate name, role, location, and craft within a single coordinated motion sequence, so that I am oriented in under five seconds and can immediately judge motion taste.

#### Acceptance Criteria

1. WHEN the `Hero_Section` enters the viewport for the first time, THE `Hero_Section` SHALL stagger the reveal of avatar, name, rotating role, meta columns, bio, DSA stats, and social icons in that order with a per-element delay between 40ms and 160ms.
2. THE `Hero_Section` SHALL preserve the existing rotating-role typewriter or marquee for `profile.roles` and SHALL keep the visible cycle period between 2.0s and 4.0s per role.
3. WHILE the `Hero_Section` is visible, THE `Hero_Section` SHALL render an animated gradient or shader halo behind the avatar whose color is derived from the active `Material_Accent` and whose animation completes one full visual cycle in 8s to 16s.
4. WHEN the user hovers the avatar with a fine pointer, THE `Hero_Section` SHALL drive a subtle parallax tilt of the avatar with a maximum rotation of 8 degrees on each axis and SHALL return to neutral within 400ms after the pointer leaves.
5. WHEN any `Animated_Counter` in the `Hero_Section` (including the DSA stats line) animates to its target, THE `Animated_Counter` SHALL converge to the exact target value within 1500ms and SHALL display the final target value as plain text once converged.
6. IF `Reduced_Motion_State` is active, THEN THE `Hero_Section` SHALL skip the staggered reveal, the gradient halo animation, the avatar tilt, and the `Animated_Counter` ramp, and SHALL render every element in its final visual state.

### Requirement 3: Signature Scroll-Driven Device Showcase

**User Story:** As an Android peer (P), I want a single signature interactive moment that visibly demonstrates real app craft, so that I can judge the candidate's mobile motion literacy without leaving the page.

#### Acceptance Criteria

1. THE `Portfolio_Site` SHALL render a `Device_Showcase` between the `Hero_Section` and the Featured Projects grid that contains a `Phone_Frame` displaying app screens for at least the Chime and Lumen projects.
2. WHILE the `Device_Showcase` is in the viewport on a viewport at least 768px wide, THE `Device_Showcase` SHALL scrub the content inside the `Phone_Frame` from the first screen to the last screen as a function of the user's vertical scroll progress through the showcase region.
3. THE `Device_Showcase` SHALL include at least three distinct screens per featured project, each annotated with a short kicker (e.g. "Realtime chat", "Voice-first AI") that fades in as the screen becomes the active one.
4. WHEN the active screen inside the `Device_Showcase` changes, THE `Device_Showcase` SHALL animate the transition between screens with a Compose-style shared-axis or container-transform motion completing within 500ms.
5. WHEN the active screen changes between two screens of different projects, THE `Device_Showcase` SHALL also animate the surrounding `Phone_Frame` from the originating project's variant to the destination project's variant via the `Device_Variant_Selector`, completing the bezel transition within 600ms.
6. WHEN the user clicks or taps the `Phone_Frame` of the `Device_Showcase` for a given project, THE `Portfolio_Site` SHALL open the corresponding `Project_Showcase` for that project.
7. WHILE the viewport is narrower than 768px, THE `Device_Showcase` SHALL switch from scroll-driven scrubbing to a horizontal swipeable carousel of the same screens, supporting both touch swipe and on-screen pagination dots.
8. IF `Reduced_Motion_State` is active, THEN THE `Device_Showcase` SHALL render a static `Phone_Frame` showing one representative screen per project with on-frame pagination controls and SHALL NOT bind to scroll progress.
9. WHEN the `Device_Showcase` initially mounts, THE `Device_Showcase` SHALL defer loading of all screen artwork beyond the first screen of each project until the user enters within 200vh of the showcase region.

### Requirement 4: Projects as Interactive Device Tiles

**User Story:** As an Android peer (P), I want each project card to feel like a tactile mobile artifact framed in the right device for that project, so that the projects grid itself reads as Android craft rather than a generic case-study list.

#### Acceptance Criteria

1. THE `Projects` grid SHALL render every `Project_Card` with the project cover artwork displayed inside a `Phone_Frame` whose variant is selected by the `Device_Variant_Selector`.
2. THE `Device_Variant_Selector` SHALL return `android` for the Chime (Voxa) project and SHALL return `ios` for the Lumen project.
3. WHERE a project record does not declare a device variant, THE `Device_Variant_Selector` SHALL default to `android`.
4. THE `Phone_Frame` of every `Project_Card` SHALL render a system-bar chrome row appropriate to its variant: for `android`, an Android 16-style status bar with time, signal, battery, and indicator pill; for `ios`, the existing iOS status-bar chrome.
5. WHEN the user hovers a `Project_Card` with a fine pointer, THE `Project_Card` SHALL apply a 3D tilt with a maximum rotation of 6 degrees per axis and SHALL render a cursor-following highlight inside the card.
6. WHEN the pointer leaves a `Project_Card`, THE `Project_Card` SHALL return to neutral rotation within 400ms.
7. WHILE a `Project_Card` is hovered with a fine pointer, THE `Project_Card` SHALL display the "Tap to preview" affordance with an animated trailing arrow.
8. WHERE `Touch_Pointer_State` is active, THE `Project_Card` SHALL render a press ripple on tap and SHALL NOT apply 3D tilt.
9. WHEN a `Project_Card` enters the viewport, THE `Project_Card` SHALL reveal with a subtle rise-and-fade and SHALL complete the reveal within 600ms.

### Requirement 5: Container-Transform Project Showcase Open

**User Story:** As an Android peer (P), I want opening a project to feel like a native Compose container-transform rather than a generic modal, so that the transition itself reads as mobile-design literacy.

#### Acceptance Criteria

1. WHEN a `Project_Card` is activated by click, tap, or Enter/Space key, THE `Portfolio_Site` SHALL perform a `Container_Transform` in which the source `Project_Card` visually morphs into the `Project_Showcase` surface using a shared-element transition rather than a cross-fade.
2. THE `Container_Transform` SHALL target completion of its open animation within 600ms with a tolerance of one animation frame (approximately 16ms), and IF the open animation exceeds approximately 616ms, THEN THE `Portfolio_Site` SHALL abort the in-progress transform and snap to the open state.
3. WHEN the `Project_Showcase` is closed, THE `Portfolio_Site` SHALL reverse the `Container_Transform` so that the surface morphs back toward the originating `Project_Card`, except WHERE the open transform was aborted or never settled (e.g. a rapid second dismissal before the open transform settles) OR WHERE `Reduced_Motion_State` is true, in which case THE `Portfolio_Site` SHALL substitute an instant close in place of the reverse transform.
4. THE `Container_Transform` SHALL preserve the relative position of the project cover artwork between the `Project_Card` and the `Project_Showcase` so that the artwork does not visually jump during the morph.
5. WHILE a `Container_Transform` is in progress, THE `Portfolio_Site` SHALL prevent any second activation of a `Project_Card` until the transform settles.
6. IF `Reduced_Motion_State` is active, THEN THE `Portfolio_Site` SHALL replace the `Container_Transform` with an instant open and an instant close of the `Project_Showcase` and SHALL still preserve focus management and keyboard dismissal.
7. WHEN the `Project_Showcase` is open, THE `Project_Showcase` SHALL trap focus within the dialog, SHALL move initial focus to the close control, and SHALL restore focus to the originating `Project_Card` on close.

### Requirement 6: Tech Stack Magnetic Icon Grid

**User Story:** As an Android peer (P), I want the tech stack section to feel playful and tactile, so that it tells me what tools the developer cares about through interaction rather than through a flat icon dump.

#### Acceptance Criteria

1. WHEN the user hovers a `Tech_Stack_Grid` icon with a fine pointer, THE `Tech_Stack_Grid` SHALL apply a `Magnetic_Hover` translation toward the cursor whose magnitude SHALL be clamped to a hard maximum of 8 pixels on each axis (i.e. any computed translation that would exceed 8 pixels SHALL be capped at 8 pixels), and SHALL return to its origin within 400ms after the pointer leaves.
2. WHEN the user hovers a `Tech_Stack_Grid` icon for at least 200ms, THE `Tech_Stack_Grid` SHALL display a tooltip containing the technology name and a single short "used in" hint (e.g. "Used in Chime"), positioned so it never clips outside the viewport.
3. WHEN a `Tech_Stack_Grid` icon is activated by keyboard, THE `Tech_Stack_Grid` SHALL render the same tooltip as on hover and SHALL place a visible focus ring around the icon.
4. WHILE the `Tech_Stack_Grid` enters the viewport, THE `Tech_Stack_Grid` SHALL stagger-reveal each icon with a per-icon delay between 20ms and 80ms.
5. WHERE `Touch_Pointer_State` is active, THE `Tech_Stack_Grid` SHALL surface the tooltip on tap rather than on hover and SHALL dismiss the tooltip immediately on tap-outside with no minimum display duration.
6. IF `Reduced_Motion_State` is active, THEN THE `Tech_Stack_Grid` SHALL skip the magnetic translation and the stagger reveal, and SHALL render every icon in its final position.

### Requirement 7: Experience Timeline Motion

**User Story:** As a recruiter (R), I want the experience timeline to read as a single visual thread tied to mobile craft, so that I can scan roles and impact without losing rhythm with the rest of the page.

#### Acceptance Criteria

1. WHEN the `Experience_Timeline` enters the viewport, THE `Experience_Timeline` SHALL animate the vertical timeline rail growing from top to bottom and SHALL complete the rail growth within 1200ms.
2. WHEN each individual entry's timeline node enters the viewport, THE `Experience_Timeline` SHALL reveal the entry's content with a horizontal slide of no more than 24px and an opacity transition completing within 500ms.
3. THE `Experience_Timeline` SHALL preserve the existing data shape and ordering of entries already supplied by the portfolio data layer.
4. WHEN the user hovers an entry with a fine pointer, THE `Experience_Timeline` SHALL elevate the entry with a subtle shadow and a translation no greater than 4px.
5. IF `Reduced_Motion_State` is active, THEN THE `Experience_Timeline` SHALL render the rail and all entries in their final visual state without growth or slide animations.

### Requirement 8: Contact Section Motion and Form Feedback

**User Story:** As a recruiter (R), I want clear, confidence-inspiring contact options that respond to my interactions, so that reaching out feels low-friction.

#### Acceptance Criteria

1. WHEN the `Contact_Section` enters the viewport, THE `Contact_Section` SHALL reveal the "Get in Touch" card and the "Send a Message" form in parallel with a stagger no greater than 120ms between them.
2. WHEN the user focuses an input field in the message form, THE `Contact_Section` SHALL animate the field's border color and label position within 250ms in a Material-style floating-label transition.
3. WHEN the user submits the message form, THE `Contact_Section` SHALL show an inline progress indicator within 100ms of submission and SHALL replace the indicator with a success or error state once the submission resolves, except WHERE the submission resolves before the 100ms deadline, in which case THE `Contact_Section` MAY skip the inline progress indicator entirely and transition directly to the success or error state without rendering a brief flash of the indicator.
4. IF the message form fails validation, THEN THE `Contact_Section` SHALL display per-field error messages adjacent to the offending fields and SHALL move keyboard focus to the first invalid field.
5. WHEN the user activates any quick-action link in "Get in Touch" (schedule call, email, LinkedIn, GitHub) by mouse, touch, or keyboard, THE `Contact_Section` SHALL render a Material-style ripple per Requirement 1.4.
6. IF `Reduced_Motion_State` is active, THEN THE `Contact_Section` SHALL skip reveal animations and field focus animations and SHALL still render valid focus rings and validation feedback.

### Requirement 9: Section Transition Choreography

**User Story:** As an Android peer (P), I want a single continuous motion thread across sections, so that the page feels like one coherent app rather than a stack of independent components.

#### Acceptance Criteria

1. THE `Portfolio_Site` SHALL render a `Section_Rail` along the page that visually connects every primary section between `Hero_Section` and `Site_Footer`.
2. WHILE the user scrolls, THE `Section_Rail` SHALL fill from top to bottom in proportion to the user's scroll progress through the page.
3. WHEN the active section changes (i.e. a new section's start crosses a fixed scroll threshold from the top of the viewport), THE `Section_Rail` SHALL update its highlighted segment within 300ms.
4. THE `Section_Rail` SHALL stay synchronized with the section index displayed by the `Scroll_Island_Nav` at all times, including during transitions between active sections, such that both consumers SHALL report the same active section on every render tick and SHALL never present a temporarily desynchronized active section to the user.
5. IF `Reduced_Motion_State` is active, THEN THE `Section_Rail` SHALL update its filled length and its highlighted segment instantly without easing.
6. WHILE the viewport is narrower than 640px, THE `Section_Rail` SHALL hide itself and SHALL delegate section indication entirely to the `Scroll_Island_Nav`.

### Requirement 10: Typography and Spacing Rhythm

**User Story:** As a recruiter (R), I want the page to read as confident and editorial without being noisy, so that the content is easy to scan.

#### Acceptance Criteria

1. THE `Portfolio_Site` SHALL define a typographic scale in which the hero display size is at least 1.6× the next largest heading size used elsewhere on the page.
2. THE `Portfolio_Site` SHALL render every "kicker" or section-label (e.g. "Featured Projects", "Experience", "Tech Stack") in a monospaced font with uppercase tracking between 0.12em and 0.20em.
3. THE `Portfolio_Site` SHALL apply a vertical rhythm in which the gap between two adjacent primary sections is at least 1.5× the gap between two adjacent direct children of the same primary section.
4. THE `Portfolio_Site` SHALL constrain body copy line-length to a maximum of 72 characters at viewport widths of 1024px and above.
5. THE `Portfolio_Site` SHALL maintain a minimum body copy line-height of 1.65 on viewports of 640px and above.

### Requirement 11: Material Accent and Live Palette Swatcher

**User Story:** As an Android peer (P), I want a live Material You-style accent picker that re-tints the page in real time, so that the portfolio itself demonstrates Material 3 dynamic-color craft rather than describing it.

#### Acceptance Criteria

1. THE `Portfolio_Site` SHALL define a fixed seed palette of between 3 and 5 named seeds (e.g. Android-green, Compose-purple, Material-blue, Sunset-coral, Mono-graphite) and SHALL expose them through the `Palette_Swatcher`.
2. THE `Palette_Swatcher` SHALL be reachable from the `Site_Header` on viewports at least 768px wide and from the `Scroll_Island_Nav` action menu on viewports narrower than 768px.
3. WHEN the user activates a seed in the `Palette_Swatcher`, THE `Portfolio_Site` SHALL update the active `Material_Accent` and SHALL retint focus rings, ripple colors, and the hero halo gradient stops within 250ms without a full page reload.
4. THE `Portfolio_Site` SHALL persist the active seed across reloads in `localStorage` and SHALL restore it on subsequent loads.
5. WHERE no seed is persisted, THE `Portfolio_Site` SHALL default to a single named "android-green" seed.
6. THE `Palette_Swatcher` SHALL render each seed as a circular swatch with a non-empty accessible name equal to the seed's display name and SHALL render a Material-style ripple per Requirement 1.4 when activated.
7. IF the active accent fails the contrast requirement of Requirement 16.4 against the current theme background, THEN THE `Portfolio_Site` SHALL substitute a contrast-compliant tonal variant of that seed for focus rings while keeping the hero halo and ripple at the original hue.

### Requirement 12: Color, Theme, and Surface Model

**User Story:** As a recruiter (R), I want the light theme to stay clean and the dark theme to feel like a real Android dark theme rather than an inverted copy, so that both themes feel intentional.

#### Acceptance Criteria

1. WHEN the active theme is light, THE `Portfolio_Site` SHALL keep page-level surfaces near white with at least 80% of the visible area within an L\* range of 92 to 100 in CIE Lab.
2. WHEN the active theme is dark, THE `Portfolio_Site` SHALL apply an elevated surface model in which adjacent stacked surfaces differ in lightness by at least 2 L\* units, mirroring Material elevation.
3. THE `Portfolio_Site` SHALL preserve all existing toggleable theme entry points and SHALL persist the user's theme choice across reloads.
4. THE `Portfolio_Site` SHALL achieve a contrast ratio of at least 4.5:1 between body text and its background and at least 3:1 between large text or icons and their background, in both themes.
5. WHEN the active theme switches, THE `Portfolio_Site` SHALL crossfade theme-dependent surfaces within 250ms without inducing visible layout shift.

### Requirement 13: Intro Overlay — Android Boot Flavor

**User Story:** As an Android peer (P), I want the existing intro to lean deeper into mobile-developer identity, so that the transition into the portfolio itself sets the tone.

#### Acceptance Criteria

1. THE `Intro_Overlay` SHALL preserve the existing GSAP FLIP morph from the "DHEERAJ" logo to the hero name (`data-morph-target="hero-name"`).
2. THE `Intro_Overlay` SHALL display an `App_Boot_Animation` that includes an Android 16-style status-bar chrome reveal (time, signal, battery, indicator pill) and a centered logo rendered in the Android system-style font, completing within 1800ms before the FLIP morph begins. IF the boot animation has not completed within 1800ms of the `Intro_Overlay` mounting, THEN THE `Intro_Overlay` SHALL cut the boot animation at exactly 1800ms and proceed to the FLIP morph.
3. WHEN the user presses Escape or Enter, THE `Intro_Overlay` SHALL skip directly to the FLIP morph outro per the existing skip behavior.
4. WHEN the `Intro_Overlay` has previously completed in the same browser (as recorded by the existing `intro-seen` flag), THE `Portfolio_Site` SHALL NOT render the `Intro_Overlay` on subsequent loads and SHALL render the `Hero_Section` immediately.
5. IF `Reduced_Motion_State` is active, THEN THE `Intro_Overlay` SHALL skip both the `App_Boot_Animation` and the FLIP morph and SHALL complete its handoff to the portfolio within 200ms by setting `data-intro-active=done`, calling `onDone`, and persisting the `intro-seen` flag so the portfolio renders fully.
6. WHILE the `Intro_Overlay` is active AND WHILE the `Intro_Overlay` is unmounting (i.e. after its outro begins but before the `Intro_Overlay` is fully removed from the DOM), THE `Intro_Overlay` SHALL set `data-intro-active` on the document element AND SHALL actively suppress portfolio animations (rather than merely exposing the flag), and this suppression SHALL persist until the `Intro_Overlay` is fully unmounted from the DOM.

### Requirement 14: Scroll Island Nav Motion

**User Story:** As a visitor on any device, I want the floating section nav to feel like a Dynamic Island that responds to my scroll, so that I always know where I am in the page and can jump anywhere with one interaction.

#### Acceptance Criteria

1. THE `Scroll_Island_Nav` SHALL remain pinned to the top of the viewport at all scroll positions on viewports of 480px and above.
2. WHILE the user scrolls, THE `Scroll_Island_Nav` SHALL update its scroll-progress percentage value with no more than 100ms of perceived lag.
3. WHEN the user opens the section index dropdown, THE `Scroll_Island_Nav` SHALL animate the expansion with a spring transition completing within 400ms.
4. WHEN the user selects a section from the index, THE `Scroll_Island_Nav` SHALL smooth-scroll the page to the section's top edge with the section's top aligned to a scroll-margin offset that accounts for the nav's pinned height.
5. WHEN the user activates a section from the keyboard, THE `Scroll_Island_Nav` SHALL move keyboard focus to the destination section's primary heading after the scroll completes.
6. WHILE the dropdown is open OR WHILE the dropdown is closing (including during any close animation, until the dropdown is fully closed), THE `Scroll_Island_Nav` SHALL trap focus within the dropdown and SHALL NOT release focus prematurely, and the dropdown SHALL close on Escape and on outside click or tap.
7. IF `Reduced_Motion_State` is active, THEN THE `Scroll_Island_Nav` SHALL skip dropdown spring animation and SHALL use instant scroll positioning instead of smooth scrolling.

### Requirement 15: Mobile and Touch Experience

**User Story:** As a recruiter on a phone (R) or an Android peer testing on a device (P), I want the portfolio to feel exceptional on a real phone, including touch gestures and momentum, so that the medium reinforces the message.

#### Acceptance Criteria

1. THE `Portfolio_Site` SHALL render a single-column layout at viewport widths below 640px in which no element overflows the viewport horizontally.
2. WHEN a viewport is narrower than 768px, THE `Project_Showcase` SHALL behave as a bottom-sheet style surface that opens upward and SHALL be dismissible by a downward swipe of at least 80px on the sheet header.
3. THE `Device_Showcase` carousel referenced in Requirement 3.7 SHALL respond to horizontal touch swipe with momentum, snap to the nearest screen on release, and SHALL expose pagination dots that are activatable by tap.

4. THE `Portfolio_Site` SHALL provide a minimum touch target of 44px by 44px for every interactive element on viewports narrower than 768px.
5. WHILE `Touch_Pointer_State` is active, THE `Portfolio_Site` SHALL replace hover-only animations across `Project_Card`, `Tech_Stack_Grid`, and `Hero_Section` with press-feedback equivalents per Requirements 1.5, 4.8, and 6.5.
6. THE `Portfolio_Site` SHALL render the `Hero_Section` and the first project's `Phone_Frame` on a 390×844 device without horizontal scrolling or text clipping.

### Requirement 16: Performance Budget

**User Story:** As a constrained visitor (C), I want the redesigned page to load and respond quickly, so that the visual richness does not punish my device or connection.

#### Acceptance Criteria

1. WHEN the `Portfolio_Site` is loaded on a Moto G Power class device profile in a Lighthouse mobile run, THE `Portfolio_Site` SHALL achieve a Largest Contentful Paint of 2.5 seconds or less.
2. WHEN the `Portfolio_Site` is loaded on the same profile, THE `Portfolio_Site` SHALL achieve a Cumulative Layout Shift of 0.10 or less.
3. WHEN the `Portfolio_Site` is loaded on the same profile, THE `Portfolio_Site` SHALL achieve an Interaction to Next Paint of 200 milliseconds or less for any of: opening a `Project_Showcase`, opening the `Scroll_Island_Nav` index, focusing a contact form input, activating a `Palette_Swatcher` swatch.
4. THE `Portfolio_Site` SHALL defer initialization of any shader background (including the avatar shader and any hero halo shader) until the containing element is within 200vh of the viewport.
5. THE `Portfolio_Site` SHALL lazy-load all `Device_Showcase` screen artwork beyond the first screen of each project per Requirement 3.9.
6. WHEN the user's connection is reported as `2g` or `slow-2g` via `navigator.connection.effectiveType`, THE `Portfolio_Site` SHALL render static fallbacks in place of shader backgrounds and the `Device_Showcase` scroll scrubbing, regardless of whether shader-deferral per Requirement 16.4 has been triggered for those elements; this static-fallback rendering is a best-effort obligation, and IF the static-fallback rendering itself fails due to a technical error (e.g. a missing fallback asset or a runtime error during fallback rendering), THEN this requirement MAY be considered violated without blocking release.
7. THE `Portfolio_Site` SHALL serve responsive image variants for every project cover and `Device_Showcase` screen at widths corresponding to mobile, tablet, and desktop viewports.

### Requirement 17: Accessibility and Reduced Motion

**User Story:** As a constrained visitor (C), I want every animation to be optional, every interactive control to be keyboard-reachable, and every state to be perceivable without motion, so that the redesign does not exclude me.

#### Acceptance Criteria

1. THE `Motion_Engine` SHALL expose a single `Reduced_Motion_State` boolean derived from `window.matchMedia('(prefers-reduced-motion: reduce)')` and SHALL update all subscribers within 100ms of a system preference change.
2. WHEN `Reduced_Motion_State` is true, THE `Portfolio_Site` SHALL render every section in its final visual state without scroll-driven, stagger, or container-transform animations, per Requirements 2.6, 3.8, 4.8, 5.6, 6.6, 7.5, 8.6, 9.5, 13.5, and 14.7. This final-visual-state obligation SHALL apply only WHILE `Reduced_Motion_State` is true and SHALL NOT prohibit non-essential ambient motion (e.g. the `Hero_Section` halo shader cycle defined in Requirement 2.3) WHILE `Reduced_Motion_State` is false.
3. THE `Portfolio_Site` SHALL ensure that every interactive element is reachable via keyboard Tab order in document source order without keyboard traps outside of intentional focus traps in `Project_Showcase` and `Scroll_Island_Nav` dropdown.
4. THE `Portfolio_Site` SHALL render a visible focus ring on every focusable element with a contrast ratio of at least 3:1 against the adjacent surface.
5. THE `Portfolio_Site` SHALL provide a non-empty accessible name for every icon-only button and link, including social icons, Tech Stack icons, `Palette_Swatcher` swatches, and `Scroll_Island_Nav` controls.
6. WHILE any element is animating — regardless of which property animates (including but not limited to opacity, transform, translate, scale, or position) and regardless of whether the element is currently visually invisible (e.g. `opacity: 0`, off-screen, or otherwise visually occluded) — THE `Portfolio_Site` SHALL keep that element present in the accessibility tree throughout the animation rather than toggling it via `display: none`, `visibility: hidden`, or `aria-hidden="true"`, including during reveal animations from invisible to visible and during animations on already-visible content.
7. THE `Portfolio_Site` SHALL not depend on color alone to convey state for any active section indicator, form validation message, or success or error confirmation.

### Requirement 18: Component Gallery (Material 3 Expressive Primitives)

**User Story:** As an Android peer (P), I want a small, optional gallery of live Material 3 Expressive UI primitives, so that I can see Compose-grade craft expressed directly in the web build.

#### Acceptance Criteria

1. THE `Portfolio_Site` SHALL render a `Component_Gallery` mounted at the existing `#components` anchor that displays at least four live Material 3 Expressive primitives from the following set: FAB, switch, chip, ripple-only button, snackbar.
2. THE `Component_Gallery` SHALL not break the existing `#components` anchor target used by `SiteHeader` navigation: navigating to `#components` SHALL scroll to the gallery's start with the same scroll-margin offset as other sections.
3. THE `Component_Gallery` SHALL keep the existing Tech Stack grid visible on the page (in the `Hero_Section` or directly above the gallery) so that no existing content is removed by the gallery's introduction.
4. WHEN any primitive in the `Component_Gallery` is interacted with, THE `Component_Gallery` SHALL respond per the same motion language as the rest of the page (ripples per Requirement 1.4, springs per Requirement 1.2).
5. IF `Reduced_Motion_State` is active, THEN THE `Component_Gallery` SHALL render every primitive in its idle visual state and SHALL still allow interactive feedback (state change) without the associated motion.
6. IF the `Component_Gallery` mounts with zero Material 3 Expressive primitives available (e.g. due to a configuration error or a primitive-loading failure), THEN THE `Component_Gallery` SHALL hide the entire gallery section from the rendered output rather than render an empty container.

### Requirement 19: Correctness Properties (Property-Based Test Targets)

**User Story:** As a maintainer, I want a small set of code-level properties that hold across many inputs, so that the design system stays trustworthy as sections evolve.

#### Acceptance Criteria

1. FOR ALL primary sections rendered by the `Portfolio_Site` (`Hero_Section`, `Device_Showcase`, `Projects`, `Experience_Timeline`, `Contact_Section`, `Site_Footer`, `Intro_Overlay`, `Scroll_Island_Nav`, `Component_Gallery`), WHEN `Reduced_Motion_State` is true, THE section SHALL render without invoking `motion` or `gsap` animation timelines.
2. FOR ALL `Animated_Counter` instances initialized with a finite numeric target T, THE `Animated_Counter` SHALL converge so that its rendered value equals T within 1500ms of mount.
3. FOR ALL `Project_Card` instances rendered from the portfolio data, THE `Project_Card` SHALL be activatable by both Enter and Space keys when focused and SHALL invoke the same handler that a click invokes, and a click SHALL activate the same handler regardless of whether the card was focused beforehand.
4. FOR ALL valid `projects` data entries, THE `Container_Transform` SHALL preserve the project's identifier between the originating `Project_Card` and the opened `Project_Showcase`, such that closing the showcase returns focus to the same `Project_Card` element.
5. FOR ALL active scroll positions on viewports at least 768px wide, THE `Section_Rail` filled length and the `Scroll_Island_Nav` active section index SHALL agree on a single active section.
6. FOR ALL focus traps (`Project_Showcase`, `Scroll_Island_Nav` dropdown), Tab and Shift+Tab cycles starting from any focusable child SHALL return to that same child within one full cycle and SHALL never escape the trap until the trap is dismissed.
7. FOR ALL `Project_Card` and `Tech_Stack_Grid` items, the rendered DOM SHALL include a non-empty accessible name discoverable via `getByRole` with a name predicate.
8. FOR ALL valid `projects` data entries, THE `Device_Variant_Selector` SHALL return a value in the set {`android`, `ios`} and SHALL be a pure function (same input produces same output across repeated calls).
9. FOR ALL seeds in the `Material_Accent` palette and FOR ALL active themes, THE active focus-ring color resolved by Requirement 11.7 SHALL satisfy the 3:1 contrast requirement of Requirement 17.4 against the current theme background.

### Requirement 20: Backwards-Compatible Data Shape

**User Story:** As a maintainer, I want the redesign to keep the existing `portfolio-data.ts` data shape, so that this is a visual and motion overhaul rather than a content migration.

#### Acceptance Criteria

1. THE `Portfolio_Site` SHALL consume the existing `profile`, `projects`, `experience`, `socialLinks`, and `techStack` exports from the portfolio data module without changes to their existing field names or types.
2. WHERE a new visual feature requires additional per-project assets (e.g. `Device_Showcase` screens, declared device variant), THE `Portfolio_Site` SHALL extend the existing project record only with optional fields and SHALL render a graceful fallback for every such optional field that is absent on any project record.
3. THE `Portfolio_Site` SHALL keep the existing `data-morph-target="hero-name"` hook on the hero name element used by the `Intro_Overlay` FLIP morph.
4. THE `Portfolio_Site` SHALL keep the existing section ids (`#home`, `#about`, `#components`, `#projects`) used as anchor targets and SHALL extend them only with additive new ids.
