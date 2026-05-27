import type { ReactNode } from "react";
import { ArrowUpRight, Calendar, Mail, Send } from "lucide-react";
import {
  LiquidMetalCard as Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/liquid-metal-card";
import { profile, socialLinks } from "@/lib/portfolio-data";
import { Reveal } from "./reveal";
import { SectionLabel } from "./section-label";
import { GitHubIcon, LinkedInIcon } from "./brand-icons";

function ContactRow({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  href: string;
}) {
  const external = href.startsWith("http");

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group flex items-center gap-4 border-b border-black/[0.06] px-6 py-3.5 transition-colors duration-150 ease-in-out last:border-b-0 hover:bg-black/[0.02] dark:border-white/[0.06] dark:hover:bg-white/[0.02]"
    >
      <span className="text-muted-2">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-base font-medium text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block truncate font-sans text-sm text-muted-2">
          {subtitle}
        </span>
      </span>
      <ArrowUpRight className="size-5 text-muted-2 transition-colors duration-150 group-hover:text-foreground" />
    </a>
  );
}

export function ContactSection() {
  return (
    <Reveal delay={200} className="mt-16">
      <section id="contact">
        <SectionLabel>Let&apos;s Work Together</SectionLabel>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* LEFT — Get in Touch with LiquidMetal shader */}
          <Card className="flex h-full flex-col px-7 py-6">
            <div className="mb-4">
              <CardTitle className="mb-2 font-sans text-2xl font-medium text-foreground">
                Get in Touch
              </CardTitle>
              <CardDescription className="font-sans text-base leading-[1.6] text-muted-foreground dark:text-[#b2b2b2]">
                Choose your preferred method to connect and discuss your
                project.
              </CardDescription>
            </div>
            <div className="-mx-6">
              <ContactRow
                icon={<Calendar className="size-6" />}
                title="Schedule a free call"
                subtitle="30-minute strategy session"
                href={`mailto:${profile.email}?subject=Project%20call`}
              />
              <ContactRow
                icon={<Mail className="size-6" />}
                title={profile.email}
                subtitle="Quick inquiries and questions"
                href={socialLinks.email}
              />
              <ContactRow
                icon={<LinkedInIcon className="size-6" />}
                title="Connect on LinkedIn"
                subtitle="Open to roles and collaboration"
                href={socialLinks.linkedin}
              />
              <ContactRow
                icon={<GitHubIcon className="size-6" />}
                title="GitHub"
                subtitle="See my code and projects"
                href={socialLinks.github}
              />
            </div>
            <p className="mt-5 font-sans text-sm text-muted-2">
              Open to internship and full-time roles. Replies within 24 hours.
            </p>
          </Card>

          {/* RIGHT — Send a Message form with LiquidMetal shader */}
          <Card className="h-full px-7 py-6">
            <div className="mb-4">
              <CardTitle className="mb-2 font-sans text-2xl font-medium text-foreground">
                Send a Message
              </CardTitle>
              <CardDescription className="font-sans text-base leading-[1.6] text-muted-foreground dark:text-[#b2b2b2]">
                Prefer to write? Send a short note and I will reply soon.
              </CardDescription>
            </div>
            <form className="space-y-4">
              <input
                aria-label="Full name"
                className="w-full rounded-lg border border-input bg-background px-4 py-3.5 font-sans text-base text-foreground transition-[border-color,background-color] ease-in-out placeholder:text-muted-2 hover:border-black/[0.16] focus:border-black/[0.22] focus:outline-none dark:hover:border-white/[0.15] dark:focus:border-white/[0.18]"
                name="name"
                placeholder="Full Name"
              />
              <input
                aria-label="Email address"
                className="w-full rounded-lg border border-input bg-background px-4 py-3.5 font-sans text-base text-foreground transition-[border-color,background-color] ease-in-out placeholder:text-muted-2 hover:border-black/[0.16] focus:border-black/[0.22] focus:outline-none dark:hover:border-white/[0.15] dark:focus:border-white/[0.18]"
                name="email"
                type="email"
                placeholder="Email Address"
              />
              <textarea
                aria-label="Message"
                className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3.5 font-sans text-base text-foreground transition-[border-color,background-color] ease-in-out placeholder:text-muted-2 hover:border-black/[0.16] focus:border-black/[0.22] focus:outline-none dark:hover:border-white/[0.15] dark:focus:border-white/[0.18]"
                name="message"
                rows={4}
                placeholder="Your Message"
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-input bg-background px-5 py-3.5 font-sans text-base font-medium text-foreground transition-[background-color,border-color] duration-200 ease-out hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send Message <Send className="size-5" />
              </button>
            </form>
          </Card>
        </div>

        <figure className="mt-10 rounded-xl border border-black/[0.05] bg-black/[0.005] px-7 py-6 text-center dark:border-white/[0.06] dark:bg-white/[0.02]">
          <blockquote className="font-sans text-base leading-[1.7] text-muted-foreground">
            Drop by drop is the water pot filled. Likewise, the wise person
            accumulates excellence gradually.
          </blockquote>
          <figcaption className="mt-3 font-sans text-sm text-muted-2">
            Buddha
          </figcaption>
        </figure>
      </section>
    </Reveal>
  );
}
