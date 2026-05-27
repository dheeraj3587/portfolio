# Requirements Document

## Introduction

The `IPhoneFrame` component renders a CSS recreation of the iPhone 17 Pro Max that hosts app preview screens (Chime and CRM) in `project-showcase.tsx`. Two cosmetic problems are visible today: (1) the screen container paints `#fff` while several app screens paint `#f2f2f7`, producing a visible horizontal seam under the Dynamic Island; (2) `SideButtons` renders rails that are roughly two pixels wide and barely protrude from the frame, so the device reads as a featureless black slab. This spec defines the requirements for fixing both problems while keeping every existing call site (`ChimeInbox`, `ChimeChat`, `ChimeCompose`, `CrmDashboard`, `CrmPipeline`, `CrmLead`, and the showcase usage) visually unchanged when no new prop is supplied.

The fix introduces a single source of truth for the screen surface — a `screenBackground` prop on `IPhoneFrame` exposed to descendants via the CSS custom property `--device-screen-bg` — and rebuilds the side buttons to iOS-correct geometry with visible titanium depth.

## Glossary

- **IPhoneFrame**: The React component at `src/components/ui/iphone-frame.tsx` that draws the iPhone body, bezel, side buttons, status bar, Dynamic Island, and home indicator.
- **Screen_Container**: The element inside `IPhoneFrame` (carrying `data-device-screen=""`) that holds the app screen content and currently has the hard-coded screen background.
- **Status_Bar**: The component drawn by `IPhoneFrame` that renders the `9:41` time and the signal/wifi/battery glyphs flanking the Dynamic Island.
- **Status_Bar_Strip**: The visual rectangle from the screen's top edge down to the bottom of the Dynamic Island row (i.e., the area the `Status_Bar` element occupies, plus the padding above the children).
- **App_Screen**: A descendant component rendered inside `IPhoneFrame` (e.g., `ChimeInbox`, `CrmDashboard`).
- **Side_Buttons**: The five physical buttons drawn on the iPhone body — Action, Volume Up, Volume Down, Side / Power, Camera Control.
- **Titanium_Rail**: The outer titanium-finish border of the iPhone body (the area between the device's outer edge and the inner bezel).
- **Dynamic_Island**: The black pill drawn near the top of the screen.
- **Home_Indicator**: The horizontal pill drawn near the bottom of the screen.
- **screenBackground**: New optional prop on `IPhoneFrame` accepting any CSS `<color>` string. Drives both the `background` of `Screen_Container` and the `--device-screen-bg` CSS custom property.
- **--device-screen-bg**: CSS custom property set on `Screen_Container`. App screens consume it to paint their root background, ensuring the strip and content always match.
- **screenColorScheme**: Existing prop on `IPhoneFrame` with values `"light"` or `"dark"`. Drives the default `screenBackground` when none is supplied.
- **statusBarTint**: Existing prop on `IPhoneFrame` with values `"auto"`, `"light"`, or `"dark"`. Determines the colour of the time and status glyphs.
- **Perceptual_Luminance**: WCAG sRGB relative luminance of a colour, normalised to `[0, 1]`. Used to decide auto status-bar tint.

## Requirements

### Requirement 1: Unified screen surface

**User Story:** As a viewer of the project showcase, I want the iPhone screen to look like one continuous surface so that the device reads as a real phone instead of two stacked panels with a seam under the Dynamic Island.

#### Acceptance Criteria

1. THE IPhoneFrame SHALL render no opaque rectangle between the top of the Screen_Container and the bottom of the Status_Bar that paints a colour different from the resolved screen background.
2. WHEN an App_Screen consumes `var(--device-screen-bg)` to paint its root background, THE IPhoneFrame SHALL set the same colour value on both the Screen_Container's CSS `background` property and the `--device-screen-bg` custom property.
3. THE Status_Bar SHALL render with `background: transparent` so the resolved screen background shows through behind the time and status glyphs.

### Requirement 2: Recognisable iPhone body

**User Story:** As a viewer of the project showcase, I want the iPhone body to look like an iPhone 17 Pro Max — five visible side buttons in iOS-correct positions and a titanium rail with perceived depth — so that the device is unambiguously recognisable instead of reading as a black rectangle.

#### Acceptance Criteria

1. WHERE the IPhoneFrame is rendered with a `width` in the range `[200, 600]` pixels, THE Side_Buttons SHALL render with a per-rail thickness of at least 5 pixels and an outward inset of at least 1 pixel beyond the frame's outer edge.
2. THE Side_Buttons SHALL place each rail at the iOS-correct position and length defined in the design's side-button geometry table (Action, Volume Up, Volume Down on the left; Side / Power and Camera Control on the right).
3. THE Side_Buttons SHALL render exactly five rail elements whose roles, in DOM order, are `action`, `volumeUp`, `volumeDown`, `side`, `cameraControl`.
4. THE Camera Control rail SHALL render with a centreline colour darker than the centreline colour of the other right-side rail, regardless of the selected `finish`.
5. THE Titanium_Rail SHALL render with both an inner highlight (white at 25% opacity or less) and a darker recess line at the join between the rail and the inner bezel.

### Requirement 3: Backwards-compatible defaults

**User Story:** As a maintainer of existing call sites, I want call sites that do not pass `screenBackground` to render identically to today, so that adding the new prop does not introduce a visual regression in any unmigrated usage.

#### Acceptance Criteria

1. IF `screenBackground` is omitted AND `screenColorScheme` is `"light"`, THEN THE Screen_Container's resolved background colour SHALL equal `#ffffff`.
2. IF `screenBackground` is omitted AND `screenColorScheme` is `"dark"`, THEN THE Screen_Container's resolved background colour SHALL equal `#0a0a0b`.
3. WHEN `screenBackground` is omitted, THE IPhoneFrame SHALL still set `--device-screen-bg` on the Screen_Container to the resolved default colour, so any descendant that consumes the variable continues to read a usable value.

### Requirement 4: Status-bar legibility

**User Story:** As a viewer of the project showcase, I want the status-bar text to remain legible whatever screen background is applied, so that the time and glyphs never wash out on a light or dark surface.

#### Acceptance Criteria

1. WHILE `statusBarTint` is `"auto"` AND the resolved screen background's Perceptual_Luminance is greater than or equal to `0.5`, THE Status_Bar SHALL render its text and glyphs in `#0a0a0b`.
2. WHILE `statusBarTint` is `"auto"` AND the resolved screen background's Perceptual_Luminance is less than `0.5`, THE Status_Bar SHALL render its text and glyphs in `#f4f4f5`.
3. WHEN `statusBarTint` is `"light"`, THE Status_Bar SHALL render its text and glyphs in `#f4f4f5`.
4. WHEN `statusBarTint` is `"dark"`, THE Status_Bar SHALL render its text and glyphs in `#0a0a0b`.
5. IF `screenBackground` is a non-parsable CSS colour (gradient, custom property, named colour), THEN THE IPhoneFrame SHALL fall back to `screenColorScheme`-derived luminance (`1.0` for `"light"`, `0.04` for `"dark"`) when resolving the auto tint.

### Requirement 5: Per-screen migration

**User Story:** As an author of the Chime and CRM preview screens, I want each migrated app screen to read its background from the device's CSS custom property, so that the strip above the screen always matches the screen content while still rendering correctly when the screen is mounted outside `IPhoneFrame`.

#### Acceptance Criteria

1. THE migrated App_Screens (`ChimeInbox`, `ChimeChat`, `ChimeCompose`, `CrmDashboard`, `CrmPipeline`, `CrmLead`) SHALL paint their root background via `var(--device-screen-bg, <fallback>)` instead of a hard-coded class such as `bg-[#f2f2f7]` or `bg-white`.
2. THE `<fallback>` value in the migrated App_Screens SHALL match the colour the screen previously hard-coded (`#f2f2f7` for Chime Inbox and the three CRM screens, `#ffffff` for Chime Chat and Chime Compose) so the screen still renders correctly when mounted outside `IPhoneFrame`.
3. THE `project-showcase` SHALL pass an explicit `screenBackground` value to `IPhoneFrame` that matches the active screen's expected background, so the strip and the screen content always paint the same colour.

### Requirement 6: No layout regression

**User Story:** As a maintainer of `IPhoneFrame`, I want the existing geometry of the status bar, children, Dynamic Island, and home indicator to be preserved, so that the visual fix does not shift any element on the page.

#### Acceptance Criteria

1. THE Status_Bar SHALL remain vertically centred on the Dynamic_Island row (its `top` and `height` values SHALL equal the existing computations driven by `islandTop` and `islandHeight`).
2. WHEN `showStatusBar` is `true`, THE Screen_Container SHALL continue to apply a `paddingTop` equal to the existing computation (`statusBarTop + statusBarHeight + Math.round(width * 0.012)`) so app content begins below the Dynamic_Island.
3. THE Home_Indicator's position, dimensions, and tint resolution SHALL remain unchanged from the current implementation.
4. THE Dynamic_Island's position, dimensions, and `z-index` SHALL remain unchanged from the current implementation.
