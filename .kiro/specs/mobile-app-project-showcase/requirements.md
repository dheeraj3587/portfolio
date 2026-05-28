# Requirements Document

## Introduction

This feature replaces the existing `crm` (Lead Management CRM) project entry in the portfolio with a new mobile app showcase: an AI-powered creative assistant app (working name: **Lumen**) that helps users generate concept ideas for fashion / motion photography. The showcase ships two interactive iPhone-frame screens — a Home screen with an animated liquid-metal hero orb (driven by mp4 assets) and a Results screen with a scrollable inspiration row and concept-starter list — both pinned with a persistent "Ask anything..." input bar.

The goal is a mockup that *feels real*: users can scroll content, tap the input, see a simulated typing/loading transition from Home to Results, and navigate between screens. No backend, no real AI calls — only rich client-side interaction.

Integration constraints:

- The new project replaces (not augments) the `crm` entry in `src/lib/portfolio-data.ts`.
- New screens live in `src/components/portfolio/phone-screens/` and are registered in `phoneScreensByProject`.
- `IPhoneFrame` remains authoritative for the status bar, Dynamic Island, side buttons, and home indicator — screen content must not duplicate them.
- Screen backgrounds continue to consume `var(--device-screen-bg, <fallback>)` so `IPhoneFrame`'s status-bar tint resolution keeps working.
- The mp4 animations from `src/assets/` drive the Home hero orb, with autoplay/loop/muted/playsInline behaviour and a `prefers-reduced-motion` fallback.
- Existing tests must continue to pass; the `screens.test.tsx` table-driven check must be updated to drop CRM rows and add the new screens.

## Glossary

- **Mobile_App_Showcase**: The composite feature replacing the CRM project — its `portfolio-data` entry, its phone screens, its registry binding, and the showcase modal behaviour for those screens.
- **Lumen_Home_Screen**: The first phone screen, containing the animated hero orb, greeting (`Hey Martin,`), heading (`What can I help with?`), and the bottom-pinned input bar.
- **Lumen_Results_Screen**: The second phone screen, containing the prompt chip, "Created in 5 seconds" progress label, horizontally scrollable inspiration row, "Quick concept starters" numbered list, and the bottom-pinned input bar.
- **Hero_Orb**: The video element on `Lumen_Home_Screen` that plays one of the two mp4 assets (`original-5728764a89b91a8c9a43356a1fd993a1.mp4`, `original-5c02a7f9fbc7d094fe648f0afc795028.mp4`) inline, muted, autoplay, looped.
- **Input_Bar**: The bottom-pinned `Ask anything...` field rendered on both screens, with a small purple-orb send button on the right edge.
- **Prompt_Chip**: The pill at the top of `Lumen_Results_Screen` displaying the submitted prompt text.
- **Inspiration_Row**: The horizontally scrollable row of inspiration image cards on `Lumen_Results_Screen`.
- **Concept_Starter_List**: The numbered list of concept names (e.g. "Velocity Veil", "Skate-Tailored", "Rain Room Glam") on `Lumen_Results_Screen`.
- **Send_Button**: The circular send affordance inside `Input_Bar`, rendered as a small purple orb with a send glyph.
- **Phone_Screens_Registry**: The exported `phoneScreensByProject` map in `src/components/portfolio/phone-screens/index.tsx` that binds `project.id` to an ordered list of `PhoneScreen` entries.
- **IPhoneFrame**: The existing `src/components/ui/iphone-frame.tsx` component that draws the device chrome (frame, side buttons, Dynamic Island, status bar, home indicator) and sets `--device-screen-bg`.
- **Project_Showcase_Modal**: The existing `ProjectShowcase` component that renders an `IPhoneFrame` with the active screen, supports keyboard navigation (← → / Esc), and auto-advances every 4500ms.
- **Reduced_Motion_Mode**: The user-agent preference reported by `window.matchMedia("(prefers-reduced-motion: reduce)")`.
- **Screen_Background_Token**: The CSS custom property `--device-screen-bg` set by `IPhoneFrame` and consumed by phone screens via `var(--device-screen-bg, <fallback>)`.

## Requirements

### Requirement 1: Replace the CRM project entry with the new mobile app project

**User Story:** As the portfolio owner, I want the CRM project removed and replaced by the new mobile app project, so that the projects grid showcases the new design without leaving stale references.

#### Acceptance Criteria

1. THE Mobile_App_Showcase SHALL define a single new project entry in `src/lib/portfolio-data.ts` with `id` set to a new kebab-case identifier distinct from `chime` and `crm`.
2. THE Mobile_App_Showcase SHALL remove the `crm` entry from the `projects` array in `src/lib/portfolio-data.ts`.
3. THE Mobile_App_Showcase SHALL preserve the existing `chime` project entry unchanged.
4. THE Mobile_App_Showcase SHALL provide `title`, `subtitle`, `description`, `image`, `links`, and `stack` fields for the new project, matching the shape of the existing `chime` entry.
5. WHERE the new project entry references a stack identifier not present in `techStack` or `projectOnlyTech`, THE Mobile_App_Showcase SHALL add that identifier to `projectOnlyTech` so that `techById.get(id)` returns a defined value for every stack id in the new entry.
6. IF the `crm` identifier is referenced by any source file under `src/` after the change, THEN THE Mobile_App_Showcase SHALL remove or update that reference so no `crm` symbol remains.

### Requirement 2: Register the new project's screens in the phone-screens registry

**User Story:** As a developer, I want the new project's screens registered in `phoneScreensByProject`, so that `ProjectShowcase` renders them automatically when the project card is opened.

#### Acceptance Criteria

1. THE Phone_Screens_Registry SHALL expose an entry keyed by the new project's `id` containing an ordered array of two `PhoneScreen` objects: `Lumen_Home_Screen` first, `Lumen_Results_Screen` second.
2. THE Phone_Screens_Registry SHALL remove the `crm` key from `phoneScreensByProject`.
3. THE Phone_Screens_Registry SHALL retain the existing `chime` key and its three screens unchanged.
4. THE Phone_Screens_Registry SHALL stop importing from `./crm-screens` and SHALL import the new screen components from a new module `./lumen-screens` (or equivalent file colocated in `src/components/portfolio/phone-screens/`).
5. FOR each new `PhoneScreen` entry, THE Phone_Screens_Registry SHALL provide `id`, `label`, `Component`, and `screenBackground` fields where `screenBackground` is a value parsable by `tryParseHexOrRgb` (hex `#rgb`/`#rrggbb` or `rgb()`/`rgba()`).

### Requirement 3: Render the Lumen Home Screen with the animated hero orb

**User Story:** As a portfolio visitor, I want the Home screen to show the animated liquid-metal orb with a greeting and an input bar, so that the mockup feels like the real app from the screenshots.

#### Acceptance Criteria

1. THE Lumen_Home_Screen SHALL render its root background via `var(--device-screen-bg, <fallback>)` where `<fallback>` is the same hex value supplied as `screenBackground` in the registry entry.
2. THE Lumen_Home_Screen SHALL render the greeting text `Hey Martin,` followed by the heading `What can I help with?`.
3. THE Lumen_Home_Screen SHALL render the Hero_Orb above the heading, vertically centred in the available space between the IPhoneFrame status-bar safe area and the Input_Bar.
4. THE Hero_Orb SHALL be an HTML `<video>` element with `muted`, `autoPlay`, `loop`, and `playsInline` attributes set, sourced from one of the two mp4 files in `src/assets/` (`original-5728764a89b91a8c9a43356a1fd993a1.mp4` or `original-5c02a7f9fbc7d094fe648f0afc795028.mp4`).
5. WHILE Reduced_Motion_Mode is inactive, THE Hero_Orb SHALL play the mp4 video continuously for as long as Lumen_Home_Screen is the active screen.
6. WHEN Reduced_Motion_Mode is active, THE Hero_Orb SHALL render a static fallback image (or the paused first-frame of the mp4) instead of an autoplaying video.
7. WHEN the Project_Showcase_Modal opens with the new project active, THE Mobile_App_Showcase SHALL display Lumen_Home_Screen with the Hero_Orb playing for between 2000ms and 3000ms before automatically transitioning to Lumen_Results_Screen.
8. THE Lumen_Home_Screen SHALL render the Input_Bar pinned to the bottom of the screen above the IPhoneFrame home-indicator safe area.
9. THE Lumen_Home_Screen SHALL NOT render any status bar, Dynamic Island, side buttons, or home indicator graphics.

### Requirement 4: Render the Lumen Results Screen with scrollable content

**User Story:** As a portfolio visitor, I want the Results screen to show a prompt chip, an inspiration row I can scroll horizontally, and a concept-starter list, so that the mockup demonstrates a complete result-rendering interaction.

#### Acceptance Criteria

1. THE Lumen_Results_Screen SHALL render its root background via `var(--device-screen-bg, <fallback>)` where `<fallback>` matches the registry entry's `screenBackground`.
2. THE Lumen_Results_Screen SHALL render the Prompt_Chip at the top of the content area displaying the prompt text `Inspiration for motion fashion photography`.
3. THE Lumen_Results_Screen SHALL render the label `Created in 5 seconds` below the Prompt_Chip.
4. THE Lumen_Results_Screen SHALL render the Inspiration_Row as a horizontally scrolling element containing at least 4 inspiration cards, with horizontal overflow scrolling enabled (`overflow-x: auto` or equivalent).
5. THE Lumen_Results_Screen SHALL render the Concept_Starter_List as a numbered list containing the entries `Velocity Veil`, `Skate-Tailored`, and `Rain Room Glam`, in that order, plus at least one additional starter for visual density.
6. THE Lumen_Results_Screen SHALL render the Input_Bar pinned to the bottom of the screen above the IPhoneFrame home-indicator safe area.
7. WHEN the Concept_Starter_List exceeds the available vertical space, THE Lumen_Results_Screen SHALL allow vertical scrolling of the content region between the Prompt_Chip and the Input_Bar without scrolling the Input_Bar itself.
8. THE Lumen_Results_Screen SHALL NOT render any status bar, Dynamic Island, side buttons, or home indicator graphics.

### Requirement 5: Make the Input Bar interactive and trigger a simulated Home → Results transition

**User Story:** As a portfolio visitor, I want to type into the Ask anything input on the Home screen and see a simulated loading state that transitions to the Results screen, so that the mockup feels alive and responsive.

#### Acceptance Criteria

1. THE Input_Bar SHALL render an editable text field with the placeholder `Ask anything...`.
2. WHEN the visitor focuses the Input_Bar, THE Input_Bar SHALL show a visible focus indicator that meets WCAG 2.1 contrast guidance against the screen background.
3. WHEN the visitor presses the Enter key while the Input_Bar is focused on Lumen_Home_Screen with non-empty text, THE Mobile_App_Showcase SHALL transition to Lumen_Results_Screen using the prompt text as the Prompt_Chip value.
4. WHEN the visitor activates the Send_Button on Lumen_Home_Screen with non-empty text, THE Mobile_App_Showcase SHALL transition to Lumen_Results_Screen using the prompt text as the Prompt_Chip value.
5. WHILE a transition from Lumen_Home_Screen to Lumen_Results_Screen is in progress, THE Mobile_App_Showcase SHALL display a simulated loading indicator overlaid on Lumen_Home_Screen for between 400ms and 1500ms before swapping to Lumen_Results_Screen and revealing the results content.
6. IF the Input_Bar text is empty when Enter is pressed or Send_Button is activated, THEN THE Mobile_App_Showcase SHALL leave the current screen unchanged and SHALL NOT trigger a transition.
7. WHEN the visitor activates the Send_Button, THE Send_Button SHALL play a visual press animation lasting at most 250ms.

### Requirement 6: Respect IPhoneFrame safe areas and screen-background convention

**User Story:** As a developer maintaining `IPhoneFrame`, I want the new screens to respect the device chrome and the `--device-screen-bg` convention, so that the status-bar tint resolution and home-indicator placement keep working without per-screen overrides.

#### Acceptance Criteria

1. THE Lumen_Home_Screen SHALL set its root container's `background` style to the literal string `var(--device-screen-bg, <fallback>)` for some hex/rgb fallback string.
2. THE Lumen_Results_Screen SHALL set its root container's `background` style to the literal string `var(--device-screen-bg, <fallback>)` for some hex/rgb fallback string.
3. THE Lumen_Home_Screen SHALL render all interactive controls within the area below the IPhoneFrame status-bar safe-area padding and above the home-indicator safe-area padding so no control overlaps device chrome.
4. THE Lumen_Results_Screen SHALL render all interactive controls within the area below the IPhoneFrame status-bar safe-area padding and above the home-indicator safe-area padding so no control overlaps device chrome.
5. THE Lumen_Home_Screen SHALL pass the `screenBackground` registered for it as the value resolved by `IPhoneFrame` via the `screenBackground` prop, with no override inside the screen component.
6. THE Lumen_Results_Screen SHALL pass the `screenBackground` registered for it as the value resolved by `IPhoneFrame` via the `screenBackground` prop, with no override inside the screen component.

### Requirement 7: Lazy-load and pause the Hero Orb video to control performance

**User Story:** As a portfolio visitor on a mid-tier device, I want the orb video to load only when the showcase modal is open and to pause when the modal closes, so that the page stays fast and the video doesn't drain resources off-screen.

#### Acceptance Criteria

1. WHEN the Project_Showcase_Modal is closed, THE Hero_Orb SHALL NOT be mounted in the DOM and SHALL NOT issue any network request for the mp4 asset.
2. WHEN the Project_Showcase_Modal opens with the new project active, THE Hero_Orb SHALL mount, request its mp4 source, and begin playback within 500ms of mount on a network-stable connection.
3. WHEN the Project_Showcase_Modal is closed while the Hero_Orb is mounted, THE Hero_Orb SHALL pause playback before unmounting.
4. WHILE Lumen_Results_Screen is the active screen, THE Hero_Orb SHALL NOT be playing.
5. WHEN the Hero_Orb has mounted, THE Hero_Orb SHALL set the `<video>` element's `preload` attribute to `metadata` or `auto` (not `none`).

### Requirement 8: Support keyboard navigation and accessibility in the new screens

**User Story:** As a keyboard or assistive-tech user, I want to navigate the new screens with the keyboard and have meaningful labels, so that the mockup is usable without a mouse.

#### Acceptance Criteria

1. THE Input_Bar SHALL expose a non-empty accessible name via `aria-label` or an associated `<label>` element.
2. THE Send_Button SHALL expose a non-empty accessible name via `aria-label` (e.g. `Send`).
3. THE Hero_Orb video element SHALL include a non-empty `aria-label` or be marked `aria-hidden="true"` when it is purely decorative.
4. WHEN the visitor presses `Tab` on Lumen_Home_Screen, THE Mobile_App_Showcase SHALL move focus to the Input_Bar first, and then to the Send_Button on the next `Tab`.
5. WHEN the visitor presses `ArrowLeft` or `ArrowRight` at the document level while the Project_Showcase_Modal is open with the new project active, THE Project_Showcase_Modal SHALL switch between Lumen_Home_Screen and Lumen_Results_Screen using its existing keyboard handler without regression.
6. WHEN the visitor presses `Escape` while the Project_Showcase_Modal is open, THE Project_Showcase_Modal SHALL close using its existing handler without regression.

### Requirement 9: Update the screen-background test to cover the new screens and drop CRM

**User Story:** As a developer, I want the existing `screens.test.tsx` updated so that it asserts the new screens consume `--device-screen-bg` and no longer references the deleted CRM screens, so that CI stays green and the convention stays enforced.

#### Acceptance Criteria

1. THE Mobile_App_Showcase SHALL remove every import and test row in `src/components/portfolio/phone-screens/screens.test.tsx` that references `CrmDashboard`, `CrmPipeline`, or `CrmLead`.
2. THE Mobile_App_Showcase SHALL add one test row per new screen component (Lumen_Home_Screen, Lumen_Results_Screen) asserting that the rendered root element's `style.background` equals the literal string `var(--device-screen-bg, <fallback>)` where `<fallback>` matches the screen's registered fallback.
3. THE Mobile_App_Showcase SHALL retain the existing test rows for `ChimeInbox`, `ChimeChat`, and `ChimeCompose` unchanged.
4. WHEN `npx vitest run src/components/portfolio/phone-screens/screens.test.tsx` is executed after the changes, THE Mobile_App_Showcase SHALL produce a passing test run for that file (failures in unrelated test files are out of scope for this requirement).

### Requirement 10: Delete the obsolete CRM screen module

**User Story:** As a developer, I want the obsolete `crm-screens.tsx` module deleted, so that dead code does not linger in the repository.

#### Acceptance Criteria

1. THE Mobile_App_Showcase SHALL delete the file `src/components/portfolio/phone-screens/crm-screens.tsx`.
2. IF any source file under `src/` imports from `./crm-screens` or `crm-screens` after the deletion, THEN THE Mobile_App_Showcase SHALL remove that import statement.
3. WHEN `npm run build` is executed after the deletion, THE Mobile_App_Showcase SHALL produce a successful build with no module-not-found errors related to `crm-screens`.
