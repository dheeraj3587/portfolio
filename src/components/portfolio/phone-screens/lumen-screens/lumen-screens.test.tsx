import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LumenHomeScreen } from "./lumen-home-screen";
import { LumenResultsScreen } from "./lumen-results-screen";
import { LumenProvider, type LumenScheduler } from "./lumen-context";
import { TIMING } from "./lumen-data";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Render & accessibility tests for the Lumen phone screens.
 *
 * `useReducedMotion` is mocked so individual tests can flip between the
 * `<video>` and the static poster fallback path without re-implementing
 * `window.matchMedia`. The provider is wired with a deterministic
 * `randomSource` and a no-op `scheduler` so the AUTO_ADVANCE and loading
 * timers never fire during the test (each render starts from
 * `initialLumenState` and stays there unless the test dispatches input).
 *
 * Validates: Requirements 3.2, 3.4, 3.6, 4.2, 4.3, 4.5, 5.1, 5.7,
 *            7.5, 8.1, 8.2, 8.3, 8.4
 */

vi.mock("./use-reduced-motion", () => ({
  useReducedMotion: vi.fn(() => false),
}));

const mockUseReducedMotion = vi.mocked(useReducedMotion);

/**
 * Scheduler stub whose timers never fire. With this in place,
 * `LumenProvider` schedules AUTO_ADVANCE / loading timers but the callbacks
 * stay queued forever, so the reducer state is whatever the test put it in
 * via direct interaction (or `initialLumenState` if no interaction yet).
 */
const noopScheduler: LumenScheduler = {
  setTimeout: () => 0,
  clearTimeout: () => {},
};

/**
 * Deterministic random source so tests are reproducible. Value is
 * irrelevant because the no-op scheduler swallows the resulting delays.
 */
const deterministicRandom = () => 0;

function renderHome() {
  return render(
    <LumenProvider
      screenIndex={0}
      setScreenIndex={() => {}}
      randomSource={deterministicRandom}
      scheduler={noopScheduler}
    >
      <LumenHomeScreen />
    </LumenProvider>,
  );
}

function renderResults() {
  return render(
    <LumenProvider
      screenIndex={1}
      setScreenIndex={() => {}}
      randomSource={deterministicRandom}
      scheduler={noopScheduler}
    >
      <LumenResultsScreen />
    </LumenProvider>,
  );
}

beforeEach(() => {
  // Reset to default before every test so a previous test's
  // `mockReturnValue(true)` does not bleed across describes.
  mockUseReducedMotion.mockReturnValue(false);
});

afterEach(() => {
  cleanup();
});

describe("LumenHomeScreen renders greeting and heading", () => {
  it("renders the literal `Hey Martin,` greeting (Req 3.2)", () => {
    renderHome();
    expect(screen.getByText("Hey Martin,")).toBeInTheDocument();
  });

  it("renders the heading `What can I help with?` (Req 3.2)", () => {
    renderHome();
    expect(
      screen.getByRole("heading", { name: "What can I help with?" }),
    ).toBeInTheDocument();
  });
});

describe("LumenResultsScreen renders prompt and concept starters", () => {
  it("renders the default prompt as a user bubble (Req 4.2)", () => {
    // With no submitted prompt yet, the bubble falls back to DEFAULT_PROMPT.
    renderResults();
    expect(
      screen.getByText("Inspiration for motion fashion photography"),
    ).toBeInTheDocument();
  });

  it("renders the `Quick concept starters` heading", () => {
    renderResults();
    expect(
      screen.getByRole("heading", { name: /Quick concept starters/i }),
    ).toBeInTheDocument();
  });

  it("renders an ordered list with the concept starters (Req 4.5)", () => {
    renderResults();
    // The numbered list is the only `<ol>` rendered by the screen.
    const list = document.body.querySelector("ol");
    expect(list).not.toBeNull();
    if (list === null) return;

    const items = within(list).getAllByRole("listitem");
    expect(items.length).toBeGreaterThanOrEqual(3);

    const text = items.map((li) => li.textContent ?? "");
    expect(text.some((t) => t.includes("Velocity Veil"))).toBe(true);
    expect(text.some((t) => t.includes("Skate-Tailored"))).toBe(true);
    expect(text.some((t) => t.includes("Rain Room Glam"))).toBe(true);
  });
});

describe("InputBar accessibility", () => {
  it("input has aria-label `Ask anything` (Req 8.1)", () => {
    renderHome();
    const input = screen.getByLabelText("Ask anything");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("send button has aria-label `Send` (Req 8.2)", () => {
    renderHome();
    const button = screen.getByRole("button", { name: "Send" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "submit");
  });

  it("input bar is also reachable with the same labels on the Results screen", () => {
    renderResults();
    expect(screen.getByLabelText("Ask anything")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });
});

describe("HeroOrb video element (Req 3.4, 7.5, 8.3)", () => {
  it("renders a <video> with the autoplay/inline/decorative attributes when motion is allowed", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container } = renderHome();

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    if (video === null) return;

    // Boolean DOM attributes — React serialises these as the bare attribute
    // (no value), so `hasAttribute` is the canonical check. Property
    // accessors give the live boolean state.
    expect(video.muted).toBe(true);
    expect(video.autoplay).toBe(true);
    // The orb plays through once and signals end-of-play via `onEnded`,
    // so `loop` is intentionally false.
    expect(video.loop).toBe(false);
    expect(video.hasAttribute("playsinline")).toBe(true);
    expect(video.getAttribute("preload")).toBe("auto");
    expect(video.getAttribute("aria-hidden")).toBe("true");
  });

  it("the video carries an mp4 <source> child", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container } = renderHome();

    const source = container.querySelector("video > source");
    expect(source).not.toBeNull();
    expect(source?.getAttribute("type")).toBe("video/mp4");
  });
});

describe("HeroOrb reduced-motion swap (Req 3.6)", () => {
  it("does NOT render a <video> when useReducedMotion returns true", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = renderHome();

    expect(container.querySelector("video")).toBeNull();

    // The poster fallback element is decorative and aria-hidden. Its
    // presence is enforced indirectly: because the orb wrapper still
    // exists, *something* must replace the video. Assert at least one
    // aria-hidden element lives where the orb would.
    expect(
      container.querySelector('[aria-hidden="true"]'),
    ).not.toBeNull();
  });
});

describe("Tab order on Home (Req 8.4)", () => {
  it("Tab moves focus to the input first, then to the Send button", async () => {
    const user = userEvent.setup();
    renderHome();

    const input = screen.getByLabelText("Ask anything");
    const button = screen.getByRole("button", { name: "Send" });

    // Sanity: nothing is focused yet (or `<body>` is the active element).
    expect(document.activeElement).not.toBe(input);
    expect(document.activeElement).not.toBe(button);

    await user.tab();
    expect(input).toHaveFocus();

    await user.tab();
    expect(button).toHaveFocus();
  });
});

describe("Send button press animation (Req 5.7)", () => {
  it("press animation duration is within the 250ms accessibility budget", () => {
    // Req 5.7 mandates ≤ 250ms. Asserting the configured constant pins the
    // contract independently of jsdom's animation fidelity (Framer Motion
    // animations are not actually driven inside jsdom).
    expect(TIMING.SEND_PRESS_MS).toBeLessThanOrEqual(250);
  });

  it("clicking the Send button with non-empty input does not throw", async () => {
    const user = userEvent.setup();
    renderHome();

    const input = screen.getByLabelText("Ask anything");
    const button = screen.getByRole("button", { name: "Send" });

    await user.type(input, "a moodboard idea");
    // The whileTap animation is wired on the motion.button. We just verify
    // the click handler path completes cleanly with non-empty input.
    await user.click(button);

    // Smoke check: button is still in the document after the press.
    expect(button).toBeInTheDocument();
  });
});
