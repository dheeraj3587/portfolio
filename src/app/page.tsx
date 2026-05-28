import type { Metadata } from "next";
import { ContactSection } from "@/components/portfolio/contact-section";
// Heavy client-only sections are loaded through `next/dynamic({ ssr: false })`
// from `dynamic-sections.tsx` (task 16.1, Requirements 16.1 / 16.3) so the
// initial page payload stays small. `page.tsx` itself is a Server Component,
// which is why the dynamic imports live in a dedicated Client module.
import {
  ComponentGallery,
  DeviceShowcase,
} from "@/components/portfolio/dynamic-sections";
import { ExperienceSection } from "@/components/portfolio/experience-section";
import { IntroGate } from "@/components/portfolio/intro-gate";
import { ProfileSection } from "@/components/portfolio/profile-section";
import { ProjectsSection } from "@/components/portfolio/projects-section";
import { ScrollIslandNav } from "@/components/portfolio/scroll-island-nav";
import { SectionRail } from "@/components/portfolio/section-rail";
import { SiteFooter } from "@/components/portfolio/site-footer";
import { SiteHeader } from "@/components/portfolio/site-header";

export const metadata: Metadata = {
  title: "Dheeraj Joshi — Android & Backend Developer",
  description:
    "Portfolio of Dheeraj Joshi, a final-year B.Tech (CSE) student building Android apps with Kotlin and Jetpack Compose, and backend services with Java and Spring Boot.",
};

export default function Home() {
  return (
    <IntroGate>
      <main className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <ScrollIslandNav />
        {/*
         * SectionRail is mounted once at the page root (Requirement 9.1).
         * Its own positioning is `position: fixed`, so it does not need
         * to live inside the centered content column to attach itself to
         * the right/left edge of the viewport.
         */}
        <SectionRail />
        <div className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-32 sm:px-10 sm:pt-36 lg:px-12">
          {/*
           * Order:
           *   • ProfileSection      — hero + Tech Stack (#home, #about).
           *   • ComponentGallery    — sibling of the Tech Stack at the
           *                           preserved `#components` anchor
           *                           (Requirements 18.1, 18.2, 20.4).
           *   • DeviceShowcase      — pinned scroll-driven stage between
           *                           hero/components and projects
           *                           (Requirement 3.1).
           *   • ProjectsSection     — `#projects`.
           *   • ExperienceSection   — `#experience`.
           *   • ContactSection      — `#contact`.
           */}
          <ProfileSection />
          <ComponentGallery />
          <DeviceShowcase />
          <ProjectsSection />
          <ExperienceSection />
          <ContactSection />
          <SiteFooter />
        </div>
      </main>
    </IntroGate>
  );
}
