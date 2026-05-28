"use client";

import type { ComponentType } from "react";
import { ChimeChat, ChimeCompose, ChimeInbox } from "./chime-screens";
import { LumenHomeScreen, LumenResultsScreen } from "./lumen-screens";

export type PhoneScreen = {
  id: string;
  label: string;
  Component: ComponentType;
  /**
   * The colour painted on the device screen container — including the
   * status-bar strip — by `IPhoneFrame`. May be:
   *   • A hex / rgb literal: tint resolution uses its WCAG luminance.
   *   • A gradient (or any other CSS value): tint resolution falls back
   *     to `screenColorScheme`, which MUST then be set explicitly.
   */
  screenBackground: string;
  /**
   * Forces the device's `colorScheme` and gives the IPhoneFrame's
   * status-bar tint resolver a deterministic answer when
   * `screenBackground` is not a parsable hex / rgb literal. Defaults to
   * `"light"` when omitted (matches `IPhoneFrame`'s own default).
   */
  screenColorScheme?: "light" | "dark";
};

export type PhoneScreenProjectEntry = {
  screens: PhoneScreen[];
  autoAdvance: { enabled: boolean; intervalMs: number };
};

export const phoneScreensByProject: Record<string, PhoneScreenProjectEntry> = {
  chime: {
    screens: [
      {
        id: "inbox",
        label: "Chats",
        Component: ChimeInbox,
        screenBackground:
          "radial-gradient(120% 70% at 50% 0%, #5a3a2c 0%, #3a261d 35%, #1a100b 70%, #0d0805 100%)",
        screenColorScheme: "dark",
      },
      {
        id: "chat",
        label: "Group",
        Component: ChimeChat,
        screenBackground:
          "radial-gradient(120% 70% at 50% 0%, #5a3a2c 0%, #3a261d 35%, #1a100b 70%, #0d0805 100%)",
        screenColorScheme: "dark",
      },
      {
        id: "compose",
        label: "Profile",
        Component: ChimeCompose,
        screenBackground:
          "radial-gradient(120% 70% at 50% 0%, #5a3a2c 0%, #3a261d 35%, #1a100b 70%, #0d0805 100%)",
        screenColorScheme: "dark",
      },
    ],
    autoAdvance: { enabled: true, intervalMs: 4500 },
  },
  lumen: {
    screens: [
      { id: "home", label: "Home", Component: LumenHomeScreen, screenBackground: "#f8f6f2" },
      { id: "results", label: "Results", Component: LumenResultsScreen, screenBackground: "#f8f6f2" },
    ],
    autoAdvance: { enabled: false, intervalMs: 0 },
  },
};
