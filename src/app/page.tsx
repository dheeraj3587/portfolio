import type { Metadata } from "next";
import { ContactSection } from "@/components/portfolio/contact-section";
import { ExperienceSection } from "@/components/portfolio/experience-section";
import { InterestsSection } from "@/components/portfolio/interests-section";
import { ProfileSection } from "@/components/portfolio/profile-section";
import { ProjectsSection } from "@/components/portfolio/projects-section";
import { ScrollIslandNav } from "@/components/portfolio/scroll-island-nav";
import { SiteFooter } from "@/components/portfolio/site-footer";
import { SiteHeader } from "@/components/portfolio/site-header";

export const metadata: Metadata = {
  title: "Dheeraj - Android Developer",
  description:
    "Portfolio of Dheeraj, an Android developer building polished mobile products.",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <ScrollIslandNav />
      <div className="relative z-10 mx-auto max-w-5xl px-8 pb-20 pt-36 md:pt-44 lg:px-0">
        <ProfileSection />
        <InterestsSection />
        <ProjectsSection />
        <ExperienceSection />
        <ContactSection />
        <SiteFooter />
      </div>
    </main>
  );
}
