import type { Metadata } from "next";
import { ContactSection } from "@/components/portfolio/contact-section";
import { ExperienceSection } from "@/components/portfolio/experience-section";
import { IntroGate } from "@/components/portfolio/intro-gate";
import { ProfileSection } from "@/components/portfolio/profile-section";
import { ProjectsSection } from "@/components/portfolio/projects-section";
import { ScrollIslandNav } from "@/components/portfolio/scroll-island-nav";
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
        <div className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-32 sm:px-10 sm:pt-36 lg:px-12">
          <ProfileSection />
          <ProjectsSection />
          <ExperienceSection />
          <ContactSection />
          <SiteFooter />
        </div>
      </main>
    </IntroGate>
  );
}
