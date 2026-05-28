import type { ReactNode } from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { ChimeChat, ChimeCompose, ChimeInbox } from "./chime-screens";
import {
  LumenHomeScreen,
  LumenProvider,
  LumenResultsScreen,
} from "./lumen-screens";

/**
 * Unit test for migrated screen backgrounds.
 *
 * Each migrated app screen (`ChimeInbox`, `ChimeChat`, `ChimeCompose`,
 * `LumenHomeScreen`, `LumenResultsScreen`) paints its root background via
 * `var(--device-screen-bg, <fallback>)` instead of a hard-coded class such
 * as `bg-[#f2f2f7]` or `bg-white`. The fallback colour matches the screen's
 * previous hard-coded background so the screen still renders correctly when
 * mounted outside `IPhoneFrame`.
 *
 * jsdom preserves the `var(...)` expression verbatim when read back via
 * `style.background` (confirmed empirically — no shorthand normalisation
 * happens for `var()` references), so an exact-string assertion is safe and
 * also serves as a regression check that no further shorthand properties
 * sneak in.
 *
 * The Lumen screens depend on `useLumen()` and must therefore render
 * inside `<LumenProvider>`. A no-op scheduler is injected so the
 * mount-time auto-advance / loading timers never fire during the test
 * (the assertion runs against the initial paint). React's Context
 * `Provider` doesn't add a DOM node, so `container.firstElementChild`
 * is still the screen's own root.
 *
 * Validates: Requirements 5.1, 5.2, 9.1, 9.2, 9.3
 */
describe("phone-screens — migrated screens consume var(--device-screen-bg)", () => {
  const NoopWrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

  const LumenWrapper = ({ children }: { children: ReactNode }) => (
    <LumenProvider
      screenIndex={0}
      setScreenIndex={() => {}}
      scheduler={{ setTimeout: () => 0, clearTimeout: () => {} }}
    >
      {children}
    </LumenProvider>
  );

  const WARM_GRADIENT =
    "radial-gradient(120% 70% at 50% 0%, #5a3a2c 0%, #3a261d 35%, #1a100b 70%, #0d0805 100%)";

  const cases = [
    { name: "ChimeInbox", Component: ChimeInbox, fallback: WARM_GRADIENT, Wrapper: NoopWrapper },
    { name: "ChimeChat", Component: ChimeChat, fallback: WARM_GRADIENT, Wrapper: NoopWrapper },
    { name: "ChimeCompose", Component: ChimeCompose, fallback: WARM_GRADIENT, Wrapper: NoopWrapper },
    { name: "LumenHomeScreen", Component: LumenHomeScreen, fallback: "#f8f6f2", Wrapper: LumenWrapper },
    { name: "LumenResultsScreen", Component: LumenResultsScreen, fallback: "#f8f6f2", Wrapper: LumenWrapper },
  ] as const;

  for (const { name, Component, fallback, Wrapper } of cases) {
    it(`${name} root paints background via var(--device-screen-bg, ${fallback})`, () => {
      const { container } = render(
        <Wrapper>
          <Component />
        </Wrapper>,
      );

      const root = container.firstElementChild as HTMLElement | null;
      expect(root).not.toBeNull();
      if (root === null) return;

      const expected = `var(--device-screen-bg, ${fallback})`;
      expect(root.style.background).toBe(expected);
    });
  }
});
