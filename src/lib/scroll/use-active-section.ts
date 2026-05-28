"use client";

import { useSyncExternalStore } from "react";

import {
  activeSectionStore,
  type SectionId,
} from "@/components/portfolio/active-section-store";

/**
 * `useActiveSection` — shared subscription to the active section id.
 *
 * Both `Section_Rail` and `Scroll_Island_Nav` consume this hook so they
 * resolve to **the same** id on every render tick (Requirement 9.4,
 * 19.5). The `ids` argument names the section ids the caller expects to
 * see; if the store ever holds a value outside that set the hook
 * returns `null` so consumers never render a section id they do not
 * recognize.
 *
 * The server snapshot is `null` because the store's state is purely a
 * client-side scroll observation. React will hydrate to whatever the
 * client snapshot reports on the first commit.
 */
export function useActiveSection(
  ids: readonly SectionId[],
): SectionId | null {
  const id = useSyncExternalStore(
    activeSectionStore.subscribe,
    activeSectionStore.getSnapshot,
    () => null,
  );
  if (id === null) return null;
  return ids.includes(id) ? id : null;
}

/**
 * `resolveActiveIndex(progress, count)` — pure helper that maps a
 * scroll-progress value in `[0, 1]` onto an integer index in
 * `[0, count - 1]`.
 *
 * Used by `Device_Showcase` to choose which `ShowcaseScreen` is active
 * at a given scroll position, and by Property 13 to verify
 * monotonicity. NaN, negative, and `> 1` inputs are clamped first so
 * the returned index is always a valid array index for a non-empty
 * list. When `count <= 0` the helper returns `0` because there is no
 * valid index to return; callers must guard against empty lists
 * separately.
 */
export function resolveActiveIndex(progress: number, count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  const lastIndex = Math.max(0, Math.floor(count) - 1);
  // `fillFromScrollProgress` already coerces NaN / negatives / >1 to
  // the unit interval, which keeps the rounding step total.
  const clamped = fillFromScrollProgress(progress);
  const raw = Math.round(clamped * lastIndex);
  // Defensive clamp in case of floating-point overshoot at the edges.
  if (raw < 0) return 0;
  if (raw > lastIndex) return lastIndex;
  return raw;
}

/**
 * `fillFromScrollProgress(progress)` — pure clamp into `[0, 1]`.
 *
 * Used by `Section_Rail` to drive the filled-track `scaleY`, and by
 * Property 20 to assert that any numeric input — including NaN,
 * negatives, and values greater than 1 — produces a value in
 * `[0, 1]`, while values already in range pass through unchanged.
 */
export function fillFromScrollProgress(progress: number): number {
  if (Number.isNaN(progress)) return 0;
  if (progress < 0) return 0;
  if (progress > 1) return 1;
  return progress;
}
