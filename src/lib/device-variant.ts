/**
 * Device variant selector.
 *
 * Pure function: same input → same output, no I/O, no globals.
 * Property-tested by Requirement 19.8 (see task 17.6).
 *
 * Per design §C.3 (`Device_Variant_Selector`):
 *   1. If the project declares a `device` of `"android"` or `"ios"`, return it.
 *   2. Otherwise, hard-coded fallback: `lumen → "ios"`.
 *   3. Otherwise default to `"android"` (Requirement 4.3).
 *
 * The argument is structurally typed (`Pick<Project, "id" | "device">`-shaped)
 * so this module does not depend on the full `Project` type. Task 7.1 adds the
 * optional `device` field to `Project` in parallel; once that lands, the
 * `Project` type from `@/lib/portfolio-data` will satisfy this signature.
 */

export type DeviceVariant = "android" | "ios";

export interface DeviceVariantProject {
  id?: string;
  device?: "android" | "ios";
}

export function selectDeviceVariant(project: DeviceVariantProject): DeviceVariant {
  if (project.device === "android" || project.device === "ios") {
    return project.device;
  }
  if (project.id === "lumen") return "ios";
  return "android";
}
