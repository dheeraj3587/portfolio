import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { IPhoneFrame } from "./iphone-frame";
import {
  relativeLuminance,
  tryParseHexOrRgb,
} from "./iphone-frame.helpers";

/**
 * Property 1 — Unified screen surface.
 *
 * For any mounted IPhoneFrame and any descendant element that consumes
 * `var(--device-screen-bg)` to paint its background, the rendered colour of
 * the status-bar strip is the same value as the screen container's
 * background. Concretely: the screen container exposes the resolved
 * `screenBackground` via both the inline `background` style and the
 * `--device-screen-bg` custom property, and the StatusBar renders
 * transparently over that surface so the strip and content read as one.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */
describe("IPhoneFrame — screen-container CSS variable + transparent status bar (Property 1)", () => {
  it("sets background and --device-screen-bg on [data-device-screen], and renders the StatusBar transparently", () => {
    const { container } = render(
      <IPhoneFrame screenBackground="#abcdef">
        <div data-testid="child" />
      </IPhoneFrame>,
    );

    // ── Screen container exposes the resolved colour via inline style and
    // the `--device-screen-bg` custom property. ───────────────────────────
    const screenEl = container.querySelector<HTMLElement>(
      "[data-device-screen]",
    );
    expect(screenEl).not.toBeNull();
    if (screenEl === null) return;

    // CSSOM normalises `#abcdef` to `rgb(171, 205, 239)` when read back via
    // `element.style.background`, so accept either the original hex or its
    // rgb()-form equivalent.
    expect(screenEl.style.background).toMatch(
      /#abcdef|rgb\(\s*171\s*,\s*205\s*,\s*239\s*\)/i,
    );
    expect(screenEl.style.getPropertyValue("--device-screen-bg")).toBe(
      "#abcdef",
    );

    // ── StatusBar — the element containing the `9:41` time text — must
    // render with a transparent background so the screen surface shows
    // through behind the time and status glyphs. ─────────────────────────
    const timeNode = screen.getByText("9:41");
    const statusBarEl = timeNode.parentElement;
    expect(statusBarEl).not.toBeNull();
    if (statusBarEl === null) return;

    expect(getComputedStyle(statusBarEl).backgroundColor).toBe(
      "rgba(0, 0, 0, 0)",
    );
  });
});

/**
 * Regression test — layout invariants.
 *
 * The visual fix introduces a new `screenBackground` prop and rebuilds the
 * side buttons, but the existing geometry of the screen container's
 * `paddingTop` and the StatusBar's `top` / `height` must stay exactly as
 * they were. This test recomputes the documented formulas from the
 * component (statusBarTop = islandTop = round(width * 0.034); height =
 * islandHeight = round(round(screenWidth * 0.29) * 37/125); padding =
 * statusBarTop + statusBarHeight + round(width * 0.012)) for `width = 360`
 * and asserts the rendered inline styles match.
 *
 * Validates: Requirements 6.1, 6.2
 */
describe("IPhoneFrame — layout invariants for width=360 (regression)", () => {
  it("preserves the documented screen paddingTop and StatusBar top/height", () => {
    const width = 360;

    // Formulas mirrored from `iphone-frame.tsx` so the test is anchored to
    // the same arithmetic as the component, not a magic number.
    const frameThickness = Math.max(5, Math.round(width * 0.022));
    const bezelThickness = Math.max(2, Math.round(width * 0.006));
    const screenWidth = width - 2 * (frameThickness + bezelThickness);
    const islandWidth = Math.round(screenWidth * 0.29);
    const islandHeight = Math.round(islandWidth * (37 / 125));
    const islandTop = Math.round(width * 0.034);
    const statusBarTop = islandTop;
    const statusBarHeight = islandHeight;
    const expectedPaddingTop =
      statusBarTop + statusBarHeight + Math.round(width * 0.012);

    const { container } = render(<IPhoneFrame width={width} />);

    // ── Screen container paddingTop matches the documented formula. ─────
    const screenEl = container.querySelector<HTMLElement>(
      "[data-device-screen]",
    );
    expect(screenEl).not.toBeNull();
    if (screenEl === null) return;

    expect(screenEl.style.paddingTop).toBe(`${expectedPaddingTop}px`);

    // ── StatusBar's inline `top` and `height` equal islandTop and
    // islandHeight, keeping it vertically centred on the Dynamic Island.
    const timeNode = within(container).getByText("9:41");
    const statusBarEl = timeNode.parentElement;
    expect(statusBarEl).not.toBeNull();
    if (statusBarEl === null) return;

    expect(statusBarEl.style.top).toBe(`${statusBarTop}px`);
    expect(statusBarEl.style.height).toBe(`${statusBarHeight}px`);

    // Sanity: the values used here match the documented islandTop /
    // islandHeight, so a future change to those formulas will surface
    // here, not silently in the visual output.
    expect(statusBarTop).toBe(islandTop);
    expect(statusBarHeight).toBe(islandHeight);
  });
});

/**
 * Property 5 — Five buttons, in order.
 *
 * `SideButtons` renders exactly five rail elements whose roles, in DOM
 * order, are `action`, `volumeUp`, `volumeDown`, `side`, `cameraControl`.
 * The geometry comes from `computeSideButtonGeometry(width)`, which is
 * separately property-tested in `iphone-frame.helpers.test.ts`; here we
 * only assert that the component wires those five entries into the DOM
 * unchanged and in the documented order.
 *
 * Validates: Requirement 2.3
 */
describe("IPhoneFrame — five side buttons in order (Property 5)", () => {
  it("renders exactly five [data-iphone-button] elements with the documented roles in DOM order", () => {
    const { container } = render(<IPhoneFrame width={360} />);

    const els = container.querySelectorAll<HTMLElement>("[data-iphone-button]");

    expect(els.length).toBe(5);
    expect(Array.from(els).map((el) => el.dataset.iphoneButton)).toEqual([
      "action",
      "volumeUp",
      "volumeDown",
      "side",
      "cameraControl",
    ]);
  });
});

/**
 * Property 6 — Camera Control reads as recessed.
 *
 * For any `finish`, the Camera Control rail's centreline (50% mid-stop) is
 * darker than the same finish's other right-side rail's centreline, so the
 * recessed-glass appearance reads regardless of the chosen body finish.
 *
 * The component encodes each rail's centreline colour as the `50%` stop of
 * a `linear-gradient(...)` written to `style.background`. We extract that
 * mid-stop hex with a regex (jsdom preserves the gradient string verbatim),
 * parse it to RGB via `tryParseHexOrRgb`, and compare WCAG relative
 * luminance.
 *
 * Validates: Requirement 2.4
 */
describe("IPhoneFrame — Camera Control darker centreline (Property 6)", () => {
  // Pull the colour token that immediately precedes the `50%` stop in a
  // `linear-gradient(...)` string. jsdom normalises hex stops to their
  // `rgb(r, g, b)` equivalent when read back via `element.style.background`,
  // so we accept either form. The colour token is then handed to
  // `tryParseHexOrRgb` for canonical parsing.
  const MID_STOP_RE =
    /(#[0-9a-f]{3,8}|rgba?\([^)]*\))\s+50%/i;

  function readMidStopColour(el: HTMLElement, role: string): string {
    const bg = el.style.background;
    const match = MID_STOP_RE.exec(bg);
    if (match === null) {
      throw new Error(
        `Could not find a '<colour> 50%' stop in style.background for ` +
          `[data-iphone-button="${role}"]: ${JSON.stringify(bg)}`,
      );
    }
    return match[1];
  }

  function midStopLuminance(el: HTMLElement, role: string): number {
    const colour = readMidStopColour(el, role);
    const parsed = tryParseHexOrRgb(colour);
    if (parsed === null) {
      throw new Error(
        `tryParseHexOrRgb returned null for the 50% stop of ` +
          `[data-iphone-button="${role}"]: ${colour}`,
      );
    }
    return relativeLuminance(parsed);
  }

  const finishes = ["natural", "black", "white"] as const;

  for (const finish of finishes) {
    it(`Camera Control's 50% mid-stop is darker than the side rail's 50% mid-stop (finish=${finish})`, () => {
      const { container } = render(
        <IPhoneFrame finish={finish} width={360} />,
      );

      const cameraEl = container.querySelector<HTMLElement>(
        '[data-iphone-button="cameraControl"]',
      );
      const sideEl = container.querySelector<HTMLElement>(
        '[data-iphone-button="side"]',
      );
      expect(cameraEl).not.toBeNull();
      expect(sideEl).not.toBeNull();
      if (cameraEl === null || sideEl === null) return;

      const cameraLuminance = midStopLuminance(cameraEl, "cameraControl");
      const sideLuminance = midStopLuminance(sideEl, "side");

      expect(cameraLuminance).toBeLessThan(sideLuminance);
    });
  }
});

/**
 * Titanium rail decoration — unit test.
 *
 * The frame container's inline `boxShadow` is a stack of inset and outer
 * shadows that together paint the titanium rail. Two of those entries give
 * the rail its perceived depth:
 *
 *   1. An inner highlight (`inset 0 0 0 1px rgba(255,255,255,0.18)`) that
 *      reads on top of the gradient as a polished metallic edge.
 *   2. A bezel-join recess (`inset 0 0 0 ${frameThickness}px rgba(0,0,0,0.55)`)
 *      that darkens the rail/bezel boundary so the rail appears to step
 *      down into the inner bezel.
 *
 * This test renders an `<IPhoneFrame />` with default props and asserts
 * that both decorations are present in the frame container's inline
 * `style.boxShadow`. The recess thickness is matched with `\d+px` so the
 * test stays anchored to the documented decoration regardless of any
 * future tweak to `frameThickness`.
 *
 * Validates: Requirement 2.5
 */
describe("IPhoneFrame — titanium rail decoration", () => {
  it("includes the inner highlight and bezel-join recess in the frame container's boxShadow", () => {
    const { container } = render(<IPhoneFrame />);

    const frameEl = container.firstElementChild as HTMLElement | null;
    expect(frameEl).not.toBeNull();
    if (frameEl === null) return;

    const boxShadow = frameEl.style.boxShadow;

    // Inner highlight — exact substring per the design spec.
    expect(boxShadow).toContain(
      "inset 0 0 0 1px rgba(255,255,255,0.18)",
    );

    // Bezel-join recess — thickness equals `frameThickness` (a positive
    // integer), so accept any digit run before `px`.
    expect(boxShadow).toMatch(
      /inset 0 0 0 \d+px rgba\(0,0,0,0\.55\)/,
    );
  });
});
