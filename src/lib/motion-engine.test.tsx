import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

import {
  __motionEngineSpy,
  gsapTimeline,
  m,
  useReducedMotionState,
} from "./motion-engine";

// ---------------------------------------------------------------------------
// matchMedia stub helper
// ---------------------------------------------------------------------------
//
// The default vitest setup installs a `matchMedia` shim that always reports
// `matches: false`. These tests need to flip the `prefers-reduced-motion`
// query between renders, so they install a richer shim that also replays
// the latest registered listener when the suite calls `setReduced(...)`.

interface MatchMediaController {
  setReduced(value: boolean): void;
  reset(): void;
}

function installMatchMedia(): MatchMediaController {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  let reduced = false;

  const factory = (query: string): MediaQueryList => {
    const mql: MediaQueryList & {
      addListener?: (cb: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (cb: (event: MediaQueryListEvent) => void) => void;
    } = {
      get matches(): boolean {
        return query.includes("reduce") ? reduced : false;
      },
      media: query,
      onchange: null,
      addEventListener: (_event: string, cb: EventListener) => {
        listeners.add(cb as unknown as (event: MediaQueryListEvent) => void);
      },
      removeEventListener: (_event: string, cb: EventListener) => {
        listeners.delete(
          cb as unknown as (event: MediaQueryListEvent) => void,
        );
      },
      addListener: (cb: (event: MediaQueryListEvent) => void) =>
        listeners.add(cb),
      removeListener: (cb: (event: MediaQueryListEvent) => void) =>
        listeners.delete(cb),
      dispatchEvent: () => false,
    } as unknown as MediaQueryList & {
      addListener?: (cb: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (cb: (event: MediaQueryListEvent) => void) => void;
    };
    return mql;
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: factory,
  });

  return {
    setReduced(value: boolean): void {
      reduced = value;
      const event = { matches: value } as MediaQueryListEvent;
      for (const cb of Array.from(listeners)) cb(event);
    },
    reset(): void {
      reduced = false;
      listeners.clear();
    },
  };
}

// The motion-engine module caches its `matchMedia` listener registration
// for the lifetime of the module. To get a clean store between tests we
// reset the module registry before each test.
let mediaCtrl: MatchMediaController;

beforeEach(async () => {
  vi.resetModules();
  mediaCtrl = installMatchMedia();
});

afterEach(() => {
  mediaCtrl.reset();
});

async function loadEngine() {
  return await import("./motion-engine");
}

// ---------------------------------------------------------------------------
// useReducedMotionState
// ---------------------------------------------------------------------------

describe("useReducedMotionState", () => {
  it("returns false on initial mount when the system reports no preference", async () => {
    const engine = await loadEngine();
    let observed: boolean | null = null;
    function Probe() {
      observed = engine.useReducedMotionState();
      return null;
    }
    render(<Probe />);
    expect(observed).toBe(false);
  });

  it("flips to true within one tick of a system change", async () => {
    const engine = await loadEngine();
    const seen: boolean[] = [];
    function Probe() {
      seen.push(engine.useReducedMotionState());
      return null;
    }
    render(<Probe />);
    expect(seen.at(-1)).toBe(false);
    act(() => {
      mediaCtrl.setReduced(true);
    });
    expect(seen.at(-1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// m<T>(tag)
// ---------------------------------------------------------------------------

describe("m(tag) wrapper", () => {
  it("renders the plain DOM tag and strips animation props under reduced motion", async () => {
    const engine = await loadEngine();
    engine.__motionEngineSpy.reset();
    mediaCtrl.setReduced(true);
    const Div = engine.m("div");
    const { container } = render(
      <Div
        data-testid="probe"
        className="static"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        hi
      </Div>,
    );
    const node = container.querySelector("[data-testid='probe']");
    expect(node?.tagName).toBe("DIV");
    expect(node?.getAttribute("class")).toBe("static");
    // Animation-only props must NOT show up as DOM attributes.
    expect(node?.getAttribute("initial")).toBeNull();
    expect(node?.getAttribute("animate")).toBeNull();
    expect(node?.getAttribute("transition")).toBeNull();
    expect(engine.__motionEngineSpy.motionAnimateCalls).toBe(0);
  });

  it("increments the motion spy counter when reduced motion is OFF", async () => {
    const engine = await loadEngine();
    engine.__motionEngineSpy.reset();
    mediaCtrl.setReduced(false);
    const Div = engine.m("div");
    render(
      <Div data-testid="probe" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        hi
      </Div>,
    );
    expect(engine.__motionEngineSpy.motionAnimateCalls).toBeGreaterThan(0);
  });

  it("returns the same wrapper for the same tag (referential stability)", async () => {
    const engine = await loadEngine();
    expect(engine.m("div")).toBe(engine.m("div"));
  });
});

// ---------------------------------------------------------------------------
// gsapTimeline
// ---------------------------------------------------------------------------

describe("gsapTimeline wrapper", () => {
  it("returns a chainable no-op timeline under reduced motion", async () => {
    const engine = await loadEngine();
    engine.__motionEngineSpy.reset();
    mediaCtrl.setReduced(true);
    const tl = engine.gsapTimeline();
    // Every gsap-fluent method must be callable and chain back to the stub.
    expect(tl.to({}, {})).toBe(tl);
    expect(tl.from({}, {})).toBe(tl);
    expect(tl.fromTo({}, {}, {})).toBe(tl);
    expect(tl.set({}, {})).toBe(tl);
    expect(tl.add(() => {})).toBe(tl);
    expect(tl.play()).toBe(tl);
    expect(tl.pause()).toBe(tl);
    expect(tl.kill()).toBe(tl);
    expect(tl.eventCallback("onComplete", () => {})).toBe(tl);
    // Sanity getters return safe defaults rather than throwing.
    expect(tl.duration()).toBe(0);
    expect(tl.progress()).toBe(0);
    expect(tl.isActive()).toBe(false);
    expect(engine.__motionEngineSpy.gsapTimelineCalls).toBe(0);
  });

  it("returns a real timeline and increments the spy when reduced motion is OFF", async () => {
    const engine = await loadEngine();
    engine.__motionEngineSpy.reset();
    mediaCtrl.setReduced(false);
    const tl = engine.gsapTimeline();
    // A real timeline carries a numeric duration and is killable.
    expect(typeof tl.duration()).toBe("number");
    expect(engine.__motionEngineSpy.gsapTimelineCalls).toBe(1);
    tl.kill();
  });
});

// ---------------------------------------------------------------------------
// __motionEngineSpy
// ---------------------------------------------------------------------------

describe("__motionEngineSpy", () => {
  it("starts at zero and reset() restores zero counters", async () => {
    const engine = await loadEngine();
    engine.__motionEngineSpy.reset();
    expect(engine.__motionEngineSpy.motionAnimateCalls).toBe(0);
    expect(engine.__motionEngineSpy.gsapTimelineCalls).toBe(0);
    mediaCtrl.setReduced(false);
    engine.gsapTimeline().kill();
    expect(engine.__motionEngineSpy.gsapTimelineCalls).toBe(1);
    engine.__motionEngineSpy.reset();
    expect(engine.__motionEngineSpy.gsapTimelineCalls).toBe(0);
  });
});

// Keep the imports referenced so tree-shaking does not eliminate them
// from the bundle of this test file before vitest starts.
void __motionEngineSpy;
void gsapTimeline;
void m;
void useReducedMotionState;
