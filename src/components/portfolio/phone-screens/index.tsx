"use client";

import type { ComponentType } from "react";
import { ChimeChat, ChimeCompose, ChimeInbox } from "./chime-screens";
import { CrmDashboard, CrmLead, CrmPipeline } from "./crm-screens";

export type PhoneScreen = {
  id: string;
  label: string;
  Component: ComponentType;
  screenBackground: string;
};

export const phoneScreensByProject: Record<string, PhoneScreen[]> = {
  chime: [
    {
      id: "inbox",
      label: "Inbox",
      Component: ChimeInbox,
      screenBackground: "#f2f2f7",
    },
    {
      id: "chat",
      label: "Live chat",
      Component: ChimeChat,
      screenBackground: "#ffffff",
    },
    {
      id: "compose",
      label: "Compose",
      Component: ChimeCompose,
      screenBackground: "#ffffff",
    },
  ],
  crm: [
    {
      id: "dashboard",
      label: "Dashboard",
      Component: CrmDashboard,
      screenBackground: "#f2f2f7",
    },
    {
      id: "pipeline",
      label: "Pipeline",
      Component: CrmPipeline,
      screenBackground: "#f2f2f7",
    },
    {
      id: "lead",
      label: "Lead",
      Component: CrmLead,
      screenBackground: "#f2f2f7",
    },
  ],
};
