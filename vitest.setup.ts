import "@testing-library/jest-dom/vitest";

// jsdom does not implement `window.matchMedia`, but several components in
// the app (theme provider, reduced-motion hook, intro gate) read it during
// mount. Provide a minimal stub that always reports "no match" so tests
// can render those components without throwing. Individual tests can
// override this by reassigning `window.matchMedia` in a `beforeEach`.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom does not implement `Element.prototype.getAnimations` or
// `Element.prototype.animate`, which the `torph` text-morph library calls
// inside its destroy/lifecycle hooks. Provide minimal stubs so components
// using `<TextMorph />` can mount and unmount without throwing.
if (typeof Element !== "undefined") {
  if (typeof Element.prototype.getAnimations !== "function") {
    Object.defineProperty(Element.prototype, "getAnimations", {
      writable: true,
      configurable: true,
      value: () => [],
    });
  }
  if (typeof Element.prototype.animate !== "function") {
    Object.defineProperty(Element.prototype, "animate", {
      writable: true,
      configurable: true,
      value: () => ({
        cancel: () => {},
        finish: () => {},
        play: () => {},
        pause: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        finished: Promise.resolve(),
      }),
    });
  }
}
