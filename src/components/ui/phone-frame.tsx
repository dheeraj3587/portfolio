import type { ReactElement } from "react";

import { AndroidPhoneFrame, type AndroidPhoneFrameProps } from "./android-phone-frame";
import { IPhoneFrame, type IPhoneFrameProps } from "./iphone-frame";

/**
 * PhoneFrame — variant dispatcher over {@link IPhoneFrame} and
 * {@link AndroidPhoneFrame}.
 *
 * The two device frames share a layout contract (`[data-device-screen]`,
 * `--device-screen-bg`, `device-screen-{light,dark}`), so descendant screen
 * content does not need to know which variant is mounted. This wrapper lets
 * callers swap the chrome from a single discriminated prop while keeping
 * variant-specific options (Android: `finish`, `pillIndicator`; iOS:
 * `showDynamicIsland`, `showHomeIndicator`, `finish: "natural" | …`) fully
 * type-checked at the call site.
 *
 * Pure-presentational, no client APIs — stays RSC-safe.
 *
 * Design: §C.2 / §C.3 of `android-developer-design-overhaul`.
 * Requirements: 4.1, 4.4.
 */

/** Discriminator for the dispatcher and downstream consumers (e.g. the
 *  `selectDeviceVariant` helper in `src/lib/device-variant.ts`). */
export type DeviceVariant = "android" | "ios";

/**
 * Discriminated union of every supported variant. The `variant` discriminator
 * narrows the rest of the props to the matching frame's prop surface, so
 * Android-only options (`finish: "obsidian" | "porcelain"`, `pillIndicator`)
 * and iOS-only options (`showDynamicIsland`, `finish: "natural" | "black" |
 * "white"`, `statusBarTint`) are statically guarded at the call site.
 */
export type PhoneFrameProps =
  | ({ variant: "ios" } & IPhoneFrameProps)
  | ({ variant: "android" } & AndroidPhoneFrameProps);

export function PhoneFrame(props: PhoneFrameProps): ReactElement {
  if (props.variant === "ios") {
    // Strip the discriminator before forwarding so React doesn't see an
    // unknown prop on the underlying frame.
    const { variant: _variant, ...rest } = props;
    void _variant;
    return <IPhoneFrame {...rest} />;
  }

  const { variant: _variant, ...rest } = props;
  void _variant;
  return <AndroidPhoneFrame {...rest} />;
}
