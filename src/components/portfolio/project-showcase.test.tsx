import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { ProjectShowcase } from "./project-showcase";
import { phoneScreensByProject } from "./phone-screens";
import { projects, techById } from "@/lib/portfolio-data";

/**
 * Integration test for showcase wiring.
 *
 * `ProjectShowcase` selects an active screen out of `phoneScreensByProject`
 * (defaulting to index 0) and forwards that screen's `screenBackground`
 * value to `<IPhoneFrame />`. The frame in turn writes the resolved value
 * onto the `--device-screen-bg` custom property on `[data-device-screen]`.
 *
 * For each shipped project (`chime` and `lumen`) we render the
 * showcase, locate the screen container, and assert that its
 * `--device-screen-bg` matches the active (first) screen's expected hex.
 * This pins down Requirement 5.3 — the showcase must pass an explicit
 * `screenBackground` value to `IPhoneFrame` that matches the active
 * screen's background, so the strip and the screen content always paint
 * the same colour.
 *
 * The registry now stores a `PhoneScreenProjectEntry` per project (an
 * envelope of `{ screens, autoAdvance }`), so reads go through
 * `phoneScreensByProject[projectId]?.screens[0]`.
 *
 * `ProjectShowcase` renders through `createPortal(overlay, document.body)`,
 * so the rendered tree is not inside the container returned by
 * `render()`. We query `document.body` directly. We also call `cleanup()`
 * between cases so the previous portal contents don't survive into the
 * next iteration's query.
 *
 * Validates: Requirement 5.3
 */
describe("ProjectShowcase — forwards active screen background to IPhoneFrame", () => {
  afterEach(() => {
    cleanup();
  });

  const cases = [
    { projectId: "chime" as const },
    { projectId: "lumen" as const },
  ];

  for (const { projectId } of cases) {
    it(`sets --device-screen-bg on [data-device-screen] for the ${projectId} project's active screen`, () => {
      const project = projects.find((p) => p.id === projectId);
      expect(project, `expected a project with id="${projectId}"`).toBeDefined();
      if (!project) return;

      const entry = phoneScreensByProject[projectId];
      const expectedBackground = entry?.screens[0]?.screenBackground;
      expect(
        expectedBackground,
        `expected an active screen with a screenBackground for "${projectId}"`,
      ).toBeDefined();
      if (!expectedBackground) return;

      render(
        <ProjectShowcase
          project={project}
          techById={techById}
          onClose={() => {}}
        />,
      );

      const screenEl = document.body.querySelector<HTMLElement>(
        "[data-device-screen]",
      );
      expect(screenEl).not.toBeNull();
      if (screenEl === null) return;

      expect(screenEl.style.getPropertyValue("--device-screen-bg")).toBe(
        expectedBackground,
      );
    });
  }
});
