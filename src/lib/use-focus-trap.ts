"use client";

/**
 * useFocusTrap — confines keyboard focus to a container while it is "active".
 *
 * Used by `Project_Showcase` (Requirement 5.7, 19.6) and the
 * `Scroll_Island_Nav` dropdown (Requirement 14.6) per design.md §X
 * "Focus-trap utility". Property 4 hammers it (`a11y.test.tsx`) to prove that
 * Tab and Shift+Tab cycles never escape an active trap (Requirement 19.6),
 * and that an inactive trap never traps (Requirement 17.3).
 *
 * Behavior contract:
 *   - On `active` flipping to true:
 *       1. Captures `document.activeElement` as the previously-focused node.
 *       2. Collects focusable descendants of `containerRef.current` using a
 *          robust selector (button, [href], input, select, textarea,
 *          [tabindex]:not([tabindex="-1"]), audio[controls], video[controls],
 *          [contenteditable]:not([contenteditable="false"])), filtered to
 *          visible / not-disabled / not-aria-hidden elements with a non-
 *          negative tab index.
 *       3. Moves focus to `initialFocusSelector` (if provided and a match
 *          exists inside the container) or the first focusable. If none are
 *          found, focuses the container itself, ensuring it carries
 *          `tabindex="-1"` so the focus is well-defined.
 *       4. Attaches a `keydown` listener on the container that:
 *            - Tab on the last focusable      → preventDefault, focus first.
 *            - Shift+Tab on the first focusable → preventDefault, focus last.
 *            - Escape                          → invoke `onEscape?.()`.
 *   - On `active` flipping to false (or hook unmount):
 *       - Removes the listener.
 *       - Restores focus to the previously-focused element if it is still in
 *         the document.
 *
 * Implementation notes:
 *   - The container's keydown handler re-collects focusables on every Tab so
 *     dynamically-mounted children are always included (the showcase mounts
 *     its body lazily, the nav dropdown swaps content during the spring).
 *   - `onEscape` and `initialFocusSelector` are read through refs so updating
 *     either does not re-tear the trap. The effect deps are `[active]`,
 *     matching the design contract.
 *   - SSR-safe: the effect short-circuits when `document` is undefined.
 */

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "button",
  "[href]",
  "input",
  "select",
  "textarea",
  '[tabindex]:not([tabindex="-1"])',
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
].join(",");

export interface UseFocusTrapOptions {
  /** When true, the trap is engaged. Flip to false to release. */
  active: boolean;
  /**
   * Optional CSS selector evaluated against the container on activation.
   * The first matching descendant receives initial focus when present.
   */
  initialFocusSelector?: string;
  /**
   * Optional handler invoked when the user presses Escape while focus is
   * inside the container. Callers wire this to dialog/dropdown dismissal.
   */
  onEscape?: () => void;
}

/**
 * Returns true if the element (or any ancestor) is hidden from assistive
 * tech via `aria-hidden="true"`, the `hidden` attribute, or zero layout box.
 */
function isHidden(el: HTMLElement): boolean {
  if (el.hidden) return true;
  let cur: Element | null = el;
  while (cur) {
    if (
      cur instanceof HTMLElement &&
      cur.getAttribute("aria-hidden") === "true"
    ) {
      return true;
    }
    cur = cur.parentElement;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return true;
  return false;
}

/**
 * Returns true for form-associated elements that expose a `disabled` IDL
 * property currently set to true (button, input, select, textarea, fieldset).
 * Naturally-focusable elements without a `disabled` property fall through.
 */
function isDisabled(el: HTMLElement): boolean {
  const candidate = el as unknown as { disabled?: boolean };
  return candidate.disabled === true;
}

/**
 * Walks the container for focusable descendants in document order, filtering
 * out disabled, hidden, aria-hidden, and tabindex="-1" elements. Re-runs on
 * every Tab so dynamically-mounted children are always honoured.
 */
function collectFocusables(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  const result: HTMLElement[] = [];
  for (const el of nodes) {
    if (el.tabIndex < 0) continue;
    if (isDisabled(el)) continue;
    if (isHidden(el)) continue;
    result.push(el);
  }
  return result;
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions,
): void {
  const { active, initialFocusSelector, onEscape } = options;

  // Latest-value refs so updating either prop does not re-tear the trap.
  const onEscapeRef = useRef(onEscape);
  const initialFocusSelectorRef = useRef(initialFocusSelector);
  onEscapeRef.current = onEscape;
  initialFocusSelectorRef.current = initialFocusSelector;

  useEffect(() => {
    if (!active) return;
    if (typeof document === "undefined") return;
    const container = containerRef.current;
    if (!container) return;

    // 1. Capture the previously-focused element so we can restore on release.
    const prevActive = document.activeElement as HTMLElement | null;

    // 2. Move initial focus.
    const selector = initialFocusSelectorRef.current;
    let initial: HTMLElement | null = null;
    if (selector) {
      try {
        initial = container.querySelector<HTMLElement>(selector);
      } catch {
        // Invalid selector — fall through to the first-focusable path.
        initial = null;
      }
    }
    if (!initial) {
      const focusables = collectFocusables(container);
      initial = focusables[0] ?? null;
    }
    if (initial) {
      initial.focus();
    } else {
      // No focusable descendants — make the container itself focusable so
      // focus has somewhere defined to live, and Tab can be intercepted.
      if (!container.hasAttribute("tabindex")) {
        container.setAttribute("tabindex", "-1");
      }
      container.focus();
    }

    // 3. Intercept Tab / Shift+Tab / Escape inside the container.
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onEscapeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = collectFocusables(container);
      if (focusables.length === 0) {
        // Nothing to cycle to — keep focus on the container.
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        // Shift+Tab on the first focusable (or on the container itself)
        // wraps to the last focusable.
        if (activeEl === first || activeEl === container) {
          event.preventDefault();
          last.focus();
        }
      } else {
        // Tab on the last focusable (or on the container itself) wraps to
        // the first focusable.
        if (activeEl === last || activeEl === container) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    // 4. On deactivate / unmount: detach + restore previous focus.
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      if (prevActive && document.contains(prevActive)) {
        try {
          prevActive.focus();
        } catch {
          // Some elements (e.g. detached SVG) may throw on focus. Swallow.
        }
      }
    };
    // The hook contract pins deps to [active]: container identity comes from
    // a ref (not a render value), and option props are read through refs so
    // changing them mid-trap does not re-tear initial-focus / restore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
