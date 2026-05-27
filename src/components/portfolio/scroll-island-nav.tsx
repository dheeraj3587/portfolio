"use client";

import { ScrollIsland, type Topic } from "@/components/ui/scroll-island-base";

const TOPICS: Topic[] = [
  {
    id: "home",
    title: "Home",
    content: "Intro, roles, and hero details.",
  },
  {
    id: "about",
    title: "About",
    content: "Bio, focus, and current stack.",
  },
  {
    id: "components",
    title: "Tech Stack",
    content: "Core tools and technologies.",
  },
  {
    id: "projects",
    title: "Projects",
    content: "Featured work highlights.",
  },
  {
    id: "experience",
    title: "Experience",
    content: "Timeline of roles and impact.",
  },
  {
    id: "contact",
    title: "Contact",
    content: "Ways to get in touch.",
  },
];

export function ScrollIslandNav() {
  return <ScrollIsland topics={TOPICS} showContent={false} usePageScroll />;
}
