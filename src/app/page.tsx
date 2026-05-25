import type { Metadata } from "next";
import { ContactSection } from "@/components/portfolio/contact-section";
import { ExperienceSection } from "@/components/portfolio/experience-section";
import { ProfileSection } from "@/components/portfolio/profile-section";
import { ProjectsSection } from "@/components/portfolio/projects-section";
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
      <div className="relative z-10 mx-auto max-w-2xl px-6 pb-12 pt-28 sm:pt-32 lg:px-0">
        <ProfileSection />
        <ProjectsSection />
        <ExperienceSection />
        <ContactSection />
        <SiteFooter />
      </div>
    </main>
  );
}
