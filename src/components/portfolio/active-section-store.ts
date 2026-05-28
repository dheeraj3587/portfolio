// Tiny external store for the active section id.
//
// The store is the single source of truth for which section the user is
// currently looking at. The `Section_Rail`'s IntersectionObserver is the
// sole writer (`setActive`); the `Scroll_Island_Nav` and any other
// consumer subscribe via `useActiveSection` (see
// `src/lib/scroll/use-active-section.ts`), which wraps
// `useSyncExternalStore`. By construction every consumer reads the same
// value on every render tick, satisfying Requirement 9.4 / 19.5.
//
// The module is intentionally framework-agnostic — no React, no DOM
// access — so it can be imported from server components without
// pulling client-only code into the server bundle. The hook layer is
// where `"use client"` lives.

export const SECTION_IDS = [
  "home",
  "components",
  "projects",
  "experience",
  "contact",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

type Listener = () => void;

let activeId: SectionId | null = null;
const listeners = new Set<Listener>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SectionId | null {
  return activeId;
}

function setActive(id: SectionId | null): void {
  if (activeId === id) return;
  activeId = id;
  // Snapshot listeners before notifying so a listener that unsubscribes
  // during its own callback does not mutate the set we are iterating.
  for (const listener of Array.from(listeners)) {
    listener();
  }
}

export const activeSectionStore = {
  subscribe,
  getSnapshot,
  setActive,
} as const;
