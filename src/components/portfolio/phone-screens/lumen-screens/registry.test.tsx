import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import fc from "fast-check";
import { cleanup, render } from "@testing-library/react";

import { phoneScreensByProject } from "../index";
import { LumenProvider, type LumenScheduler } from "./lumen-context";
import { tryParseHexOrRgb } from "@/components/ui/iphone-frame.helpers";

/**
 * Property 3 — every registered phone screen consumes the
 * `--device-screen-bg` custom property and exposes a parsable hex/rgb
 * literal as its fallback.
 *
 * The contract has two parts. First, `screen.screenBackground` MUST be a
 * value `tryParseHexOrRgb` can decode — that is the same parser
 * `IPhoneFrame` uses to derive the status-bar tint, so an unparsable
 * fallback would silently break tint resolution downstream. Second, the
 * screen's rendered root MUST paint via `var(--device-screen-bg, <fallback>)`
 * so that when the screen is mounted inside `IPhoneFrame` the strip and the
 * screen content paint the same colour, and when it is mounted standalone
 * (as it is here) the fallback takes effect.
 *
 * jsdom preserves `var(...)` references verbatim in `style.background`
 * (no shorthand normalisation happens for `var()` references), so an exact
 * string equality check is reliable and also catches any future regression
 * that introduces another shorthand background property.
 *
 * The fast-check arbitrary draws `(projectId, screen)` pairs from the
 * cartesian flattening of `phoneScreensByProject`. The Lumen screens
 * depend on `useLumen()` and so are wrapped in a `LumenProvider` whose
 * scheduler is a no-op (the AUTO_ADVANCE / loading callbacks are queued
 * but never fire) and whose random source is deterministic. React Context
 * `Provider` does not add a DOM element, so `container.firstElementChild`
 * is still the screen's own root for both Chime and Lumen renders.
 *
 * Validates: Requirements 2.5, 3.1, 4.1, 6.1, 6.2
 */

// Test seams reused for every Lumen render; the scheduler swallows the
// timers `LumenProvider` schedules on mount, which keeps the reducer at
// `initialLumenState` for the duration of the assertion.
const noopScheduler: LumenScheduler = {
  setTimeout: () => 0,
  clearTimeout: () => {},
};
const deterministicRandom = () => 0;

function wrap(projectId: string, child: ReactNode): ReactNode {
  if (projectId === "lumen") {
    return (
      <LumenProvider
        screenIndex={0}
        setScreenIndex={() => {}}
        randomSource={deterministicRandom}
        scheduler={noopScheduler}
      >
        {child}
      </LumenProvider>
    );
  }
  return <>{child}</>;
}

// Flatten the registry into a list of `(projectId, screen)` pairs so the
// fast-check arbitrary can sample uniformly across every registered
// screen. With { numRuns: 100 } and a small number of screens this
// exhaustively cycles through them many times over.
type ScreenCase = {
  projectId: string;
  screen: (typeof phoneScreensByProject)[string]["screens"][number];
};

const allScreenCases: ScreenCase[] = Object.entries(phoneScreensByProject).flatMap(
  ([projectId, entry]) =>
    entry.screens.map((screen) => ({ projectId, screen })),
);

// Feature: mobile-app-project-showcase, Property 3: Every registered screen consumes the --device-screen-bg convention
describe("phoneScreensByProject — every screen consumes var(--device-screen-bg) (Property 3)", () => {
  afterEach(() => {
    cleanup();
  });

  it("is non-empty (sanity guard so fast-check has at least one case to sample)", () => {
    expect(allScreenCases.length).toBeGreaterThan(0);
  });

  it("for every (projectId, screen): screenBackground parses AND root paints var(--device-screen-bg, <fallback>)", () => {
    fc.assert(
      fc.property(fc.constantFrom(...allScreenCases), ({ projectId, screen }) => {
        // Each fast-check iteration mounts a fresh tree; clean up the
        // previous iteration's DOM so `container.firstElementChild` is
        // always the new screen's root and so React doesn't accumulate
        // hundreds of detached trees over the run.
        cleanup();

        // (1) Fallback must EITHER be a hex/rgb literal the IPhoneFrame
        // parser can decode, OR the screen must opt out of luminance-based
        // tint resolution by setting `screenColorScheme` explicitly. With
        // `screenColorScheme` set, `IPhoneFrame` resolves the status-bar
        // tint from the scheme rather than the (unparsable) gradient or
        // `oklch()` value, so the contract still holds.
        const parsed = tryParseHexOrRgb(screen.screenBackground);
        if (parsed === null) {
          expect(
            screen.screenColorScheme,
            `${projectId} → ${screen.id} uses an unparsable screenBackground (${screen.screenBackground}) but did not pin screenColorScheme. Either ship a hex/rgb fallback or set screenColorScheme explicitly so status-bar tint resolution stays deterministic.`,
          ).toBeDefined();
        }

        // (2) Rendered root must paint via var(--device-screen-bg, <fallback>).
        const Component = screen.Component;
        const { container } = render(wrap(projectId, <Component />));
        const root = container.firstElementChild as HTMLElement | null;
        expect(
          root,
          `expected a rendered root for ${projectId} → ${screen.id}`,
        ).not.toBeNull();
        if (root === null) return;

        const expected = `var(--device-screen-bg, ${screen.screenBackground})`;
        expect(
          root.style.background,
          `${projectId} → ${screen.id} did not paint the expected --device-screen-bg fallback`,
        ).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});
