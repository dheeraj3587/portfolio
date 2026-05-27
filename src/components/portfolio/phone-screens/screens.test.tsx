import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { ChimeChat, ChimeCompose, ChimeInbox } from "./chime-screens";
import { CrmDashboard, CrmLead, CrmPipeline } from "./crm-screens";

/**
 * Unit test for migrated screen backgrounds.
 *
 * Each migrated app screen (`ChimeInbox`, `ChimeChat`, `ChimeCompose`,
 * `CrmDashboard`, `CrmPipeline`, `CrmLead`) paints its root background via
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
 * Validates: Requirements 5.1, 5.2
 */
describe("phone-screens — migrated screens consume var(--device-screen-bg)", () => {
  const cases = [
    { name: "ChimeInbox", Component: ChimeInbox, fallback: "#f2f2f7" },
    { name: "ChimeChat", Component: ChimeChat, fallback: "#ffffff" },
    { name: "ChimeCompose", Component: ChimeCompose, fallback: "#ffffff" },
    { name: "CrmDashboard", Component: CrmDashboard, fallback: "#f2f2f7" },
    { name: "CrmPipeline", Component: CrmPipeline, fallback: "#f2f2f7" },
    { name: "CrmLead", Component: CrmLead, fallback: "#f2f2f7" },
  ] as const;

  for (const { name, Component, fallback } of cases) {
    it(`${name} root paints background via var(--device-screen-bg, ${fallback})`, () => {
      const { container } = render(<Component />);

      const root = container.firstElementChild as HTMLElement | null;
      expect(root).not.toBeNull();
      if (root === null) return;

      const expected = `var(--device-screen-bg, ${fallback})`;
      expect(root.style.background).toBe(expected);
    });
  }
});
