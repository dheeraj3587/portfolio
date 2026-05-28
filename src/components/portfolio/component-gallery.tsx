"use client";

/**
 * ComponentGallery — Material 3 Expressive primitives showcase.
 *
 * Mounted as a sibling of the existing Tech Stack at the `#components`
 * anchor (Requirement 18.1, 18.3). The Tech Stack itself stays exactly
 * where it is in {@link ProfileSection} so no existing content is removed.
 *
 * Primitives shown (Requirement 18.1 — at least four of FAB / switch /
 * chip / ripple-only button / snackbar):
 *   • {@link M3FAB}          — 56×56 circular floating action button.
 *   • {@link M3Switch}       — Material 3 switch with sliding thumb +
 *                              track tint flip.
 *   • {@link M3Chip}         — assist chip; click toggles selected/idle.
 *   • {@link M3RippleButton} — text button used to demo the ripple
 *                              primitive on its own.
 *   • {@link M3Snackbar}     — open-on-click snackbar that auto-dismisses
 *                              after ~3 s.
 *
 * Every primitive shares the {@link usePressRipple} hook from
 * `@/components/ui/ripple` so ripple colour tracks `--ripple-accent` live
 * (Requirements 1.4, 11.3, 18.4).
 *
 * Reduced-motion contract (Requirement 18.5 + 19.1): state changes (switch
 * toggle, chip selection, snackbar open) work exactly the same; only the
 * motion is removed. The ripple hook itself is reduced-motion-aware and
 * silently absorbs presses without spawning a tween.
 *
 * Empty-gallery guard (Requirement 18.6): when the runtime list of
 * primitives is empty (e.g. configuration error or primitive-loading
 * failure), the entire section is hidden by returning `null` rather than
 * rendering an empty container.
 *
 * Anchor preservation (Requirement 18.2, 20.4): the section keeps the
 * `scroll-mt-32` class so `SiteHeader` / `ScrollIslandNav` jumps to
 * `#components` still land at the section start under the pinned nav.
 *
 * Code-splitting (task 16.1, Requirements 16.1 / 16.3): each M3 primitive
 * lives in its own module under `./m3/*.tsx` and is loaded through
 * `next/dynamic({ ssr: false })`, so the initial page payload only carries
 * the gallery shell — every primitive arrives in its own client chunk on
 * demand. The gallery shell itself is loaded lazily by `page.tsx` via
 * `dynamic-sections.tsx`, which keeps `motion`/`@paper-design/shaders-react`
 * out of the entry chunk.
 */

import dynamic from "next/dynamic";
import type { ComponentType, ReactElement } from "react";

import { SectionLabel } from "./section-label";

// ---------------------------------------------------------------------------
// Lazy primitive loaders (task 16.1)
// ---------------------------------------------------------------------------
//
// Each primitive is dynamic-imported with `ssr: false` so its motion +
// ripple state never executes on the server, and so the bundler emits a
// dedicated chunk per primitive. Until a chunk resolves we render a
// matching-size placeholder so the gallery's layout stays stable
// (Requirement 16.2 — no CLS while a tile hydrates).

const PRIMITIVE_PLACEHOLDER_CLASS = "size-14";

function PrimitivePlaceholder(): ReactElement {
  return (
    <span
      aria-hidden="true"
      className={`block ${PRIMITIVE_PLACEHOLDER_CLASS}`}
    />
  );
}

const M3FAB: ComponentType = dynamic(
  () => import("./m3/m3-fab").then((m) => m.M3FAB),
  { ssr: false, loading: () => <PrimitivePlaceholder /> },
);

const M3Switch: ComponentType = dynamic(
  () => import("./m3/m3-switch").then((m) => m.M3Switch),
  { ssr: false, loading: () => <PrimitivePlaceholder /> },
);

const M3Chip: ComponentType = dynamic(
  () => import("./m3/m3-chip").then((m) => m.M3Chip),
  { ssr: false, loading: () => <PrimitivePlaceholder /> },
);

const M3RippleButton: ComponentType = dynamic(
  () => import("./m3/m3-ripple-button").then((m) => m.M3RippleButton),
  { ssr: false, loading: () => <PrimitivePlaceholder /> },
);

const M3Snackbar: ComponentType = dynamic(
  () => import("./m3/m3-snackbar").then((m) => m.M3Snackbar),
  { ssr: false, loading: () => <PrimitivePlaceholder /> },
);

// ---------------------------------------------------------------------------
// ComponentGallery — section wrapper
// ---------------------------------------------------------------------------

interface PrimitiveEntry {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly render: () => ReactElement;
}

/**
 * Registry of primitives mounted by the gallery. When this list is empty
 * (e.g. every entry stubbed out due to a build/configuration error), the
 * gallery returns `null` so the entire section is hidden rather than
 * rendering an empty container (Requirement 18.6).
 */
const PRIMITIVES: ReadonlyArray<PrimitiveEntry> = [
  {
    id: "fab",
    label: "FAB",
    hint: "Extended action",
    render: () => <M3FAB />,
  },
  {
    id: "switch",
    label: "Switch",
    hint: "Toggle state",
    render: () => <M3Switch />,
  },
  {
    id: "chip",
    label: "Chip",
    hint: "Filter selection",
    render: () => <M3Chip />,
  },
  {
    id: "ripple-button",
    label: "Ripple button",
    hint: "Press feedback",
    render: () => <M3RippleButton />,
  },
  {
    id: "snackbar",
    label: "Snackbar",
    hint: "Auto-dismissing toast",
    render: () => <M3Snackbar />,
  },
];

export function ComponentGallery(): ReactElement | null {
  // Defensive guard for Requirement 18.6: hide the entire section when no
  // primitives can be rendered. With the registry above this is never the
  // case in practice, but the guard means a future config / loader failure
  // doesn't leave an empty section behind.
  if (PRIMITIVES.length === 0) {
    return null;
  }

  return (
    <section
      id="components"
      aria-label="Material components gallery"
      className="mt-16 scroll-mt-32"
    >
      <SectionLabel>Material Components</SectionLabel>
      <ul
        role="list"
        className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5"
      >
        {PRIMITIVES.map((entry) => (
          <li
            key={entry.id}
            className="flex min-h-[7.5rem] flex-col items-start justify-between gap-3"
          >
            <div className="flex min-h-14 items-end">{entry.render()}</div>
            <div className="space-y-0.5">
              <p className="font-sans text-sm font-medium text-foreground">
                {entry.label}
              </p>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-2">
                {entry.hint}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ComponentGallery;
