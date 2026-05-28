import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { projects, techById } from "@/lib/portfolio-data";

// Feature: mobile-app-project-showcase, Property 2: Stack identifiers resolve via techById
//
// For every project in `projects` and every stack id in `project.stack`,
// `techById.get(id)` MUST return a defined `TechItem` whose shape matches
// `{ id: string; name: string; src: string }`. This guarantees the project
// grid never tries to render a tech badge for an unknown id.
//
// Validates: Requirements 1.4, 1.5
describe("project stack identifiers resolve via techById (Property 2)", () => {
  // Sanity: there must be at least one project, and every project must have
  // a non-empty `stack`. Without this the cartesian-product arbitrary below
  // would have no inhabitants and fast-check would silently pass.
  it("every project has a non-empty stack", () => {
    expect(projects.length).toBeGreaterThan(0);
    for (const project of projects) {
      expect(project.stack.length).toBeGreaterThan(0);
    }
  });

  it("techById.get(id) returns a defined TechItem for every (project, stack id) pair", () => {
    // Arbitrary over (project, stackId) drawn from the cartesian product of
    // generated indices. The stack index is taken modulo the chosen
    // project's stack length so we never dereference past the end and we
    // exercise every stack entry as the integer space is explored.
    const projectStackPairArb = fc
      .tuple(
        fc.integer({ min: 0, max: projects.length - 1 }),
        fc.integer({ min: 0, max: 100 }),
      )
      .map(([projectIdx, stackIdx]) => {
        const project = projects[projectIdx];
        const id = project.stack[stackIdx % project.stack.length];
        return { projectId: project.id, stackId: id };
      });

    fc.assert(
      fc.property(projectStackPairArb, ({ stackId }) => {
        const tech = techById.get(stackId);
        expect(tech).toBeDefined();
        if (tech === undefined) return;
        expect(tech.id).toBe(stackId);
        expect(typeof tech.name).toBe("string");
        expect(tech.name.length).toBeGreaterThan(0);
        expect(typeof tech.src).toBe("string");
        expect(tech.src.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});
