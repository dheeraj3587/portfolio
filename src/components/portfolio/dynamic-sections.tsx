"use client";

/**
 * Dynamic Sections — client-side `next/dynamic` shells (task 16.1).
 *
 * `src/app/page.tsx` is a Server Component. `next/dynamic({ ssr: false })`
 * is only valid inside a Client Component, so we centralise the
 * client-only dynamic imports here and re-export the resulting components
 * for the page tree to consume.
 *
 * Each shell loads its underlying section in a dedicated client chunk so
 * the initial page payload only carries the above-the-fold UI:
 *
 *   • {@link DeviceShowcase}  — pinned scroll-driven stage between hero
 *                               and projects (chunk pulls `motion`'s
 *                               `useScroll` + `@paper-design/shaders-react`).
 *   • {@link ComponentGallery} — Material 3 primitives gallery (chunk is
 *                                a small shell; each primitive ships in
 *                                its own further-split chunk via
 *                                `component-gallery.tsx` itself).
 *
 * Validates: Requirements 16.1 (smaller initial JS payload), 16.3 (the
 * primary INP-sensitive surfaces — Project_Showcase open + Component
 * Gallery interactivity — defer their JS until the chunk loads).
 */

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import type { DeviceShowcaseProps } from "./device-showcase";

/**
 * Lazy `DeviceShowcase`. The component owns `useScroll`/`useTransform`
 * subscriptions that have no meaning on the server, so `ssr: false` is the
 * right default.
 */
export const DeviceShowcase: ComponentType<DeviceShowcaseProps> = dynamic(
  () => import("./device-showcase").then((m) => m.DeviceShowcase),
  { ssr: false },
);

/**
 * Lazy `ComponentGallery`. The gallery itself further splits each M3
 * primitive into its own chunk (see `component-gallery.tsx`), so this
 * shell is small.
 */
export const ComponentGallery: ComponentType = dynamic(
  () => import("./component-gallery").then((m) => m.ComponentGallery),
  { ssr: false },
);
