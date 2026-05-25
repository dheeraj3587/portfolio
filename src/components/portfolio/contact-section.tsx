import type { ReactNode } from "react";
import { ArrowUpRight, Calendar, Mail, Send, X } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { profile, socialLinks } from "@/lib/portfolio-data";
import { Reveal } from "./reveal";
import { SectionLabel } from "./section-label";

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
      className="contact-link-row group flex items-center gap-4 border-b border-black/[0.06] px-6 py-3.5 transition-colors duration-150 ease-in-out hover:bg-black/[0.02] last:border-b-0 dark:border-white/[0.06] dark:hover:bg-white/[0.02]"
    >
      <span className="text-muted-2">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-sm font-medium text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block font-sans text-[12.5px] text-muted-2">
          {subtitle}
        </span>
      </span>
      <ArrowUpRight className="size-4 text-[#737373] transition-colors duration-150 group-hover:text-[#111111] dark:text-[#a0a0a0] dark:group-hover:text-[#f0f0f0]" />
    </a>
  );
}

export function ContactSection() {
  return (
    <Reveal delay={200} className="mt-16">
      <section>
        <SectionLabel>Let&apos;s Work Together</SectionLabel>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card className="flex flex-col rounded-xl border border-black/[0.05] bg-black/[0.005] px-6 py-5 transition-[border-color,background-color] duration-200 ease-out dark:border-white/[0.06] dark:bg-white/[0.02]">
            <div className="mb-4">
              <CardTitle className="mb-1.5 font-sans text-lg font-medium text-foreground">
                Get in Touch
              </CardTitle>
              <CardDescription className="font-sans text-sm leading-[1.6] text-muted-foreground dark:text-[#b2b2b2]">
                Choose your preferred method to connect and discuss your
                project.
              </CardDescription>
            </div>
            <div className="-mx-6">
              <ContactRow
                icon={<Calendar className="size-5" />}
                title="Schedule a free call"
                subtitle="30-minute strategy session"
                href={`mailto:${profile.email}?subject=Project%20call`}
              />
              <ContactRow
                icon={<Mail className="size-5" />}
                title={profile.email}
                subtitle="Quick inquiries and questions"
                href={socialLinks.email}
              />
              <ContactRow
                icon={<X className="size-5" />}
                title="Connect on X"
                subtitle="Replies within 24 hours"
                href={socialLinks.x}
              />
            </div>
            <p className="mt-5 font-sans text-[12.5px] text-muted-2">
              Open to remote, freelance and full-time.
            </p>
          </Card>

          <Card className="rounded-xl border border-black/[0.05] bg-black/[0.005] px-6 py-5 transition-[border-color,background-color] duration-200 ease-out dark:border-white/[0.06] dark:bg-white/[0.02]">
            <div className="mb-4">
              <CardTitle className="mb-1.5 font-sans text-lg font-medium text-foreground">
                Send a Message
              </CardTitle>
              <CardDescription className="font-sans text-sm leading-[1.6] text-muted-foreground dark:text-[#b2b2b2]">
                Prefer to write? Send a short note and I will reply soon.
              </CardDescription>
            </div>
            <form className="space-y-3">
              <input
                aria-label="Full name"
                className="contact-input w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm text-foreground transition-[border-color,background-color] ease-in-out placeholder:text-muted-2 hover:border-black/[0.16] focus:border-black/[0.22] focus:outline-none dark:hover:border-white/[0.15] dark:focus:border-white/[0.18]"
                name="name"
                placeholder="Full Name"
              />
              <input
                aria-label="Email address"
                className="contact-input w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm text-foreground transition-[border-color,background-color] ease-in-out placeholder:text-muted-2 hover:border-black/[0.16] focus:border-black/[0.22] focus:outline-none dark:hover:border-white/[0.15] dark:focus:border-white/[0.18]"
                name="email"
                type="email"
                placeholder="Email Address"
              />
              <textarea
                aria-label="Message"
                className="contact-input w-full resize-none rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm text-foreground transition-[border-color,background-color] ease-in-out placeholder:text-muted-2 hover:border-black/[0.16] focus:border-black/[0.22] focus:outline-none dark:hover:border-white/[0.15] dark:focus:border-white/[0.18]"
                name="message"
                rows={4}
                placeholder="Your Message"
              />
              <button
                type="submit"
                className="contact-submit inline-flex w-full items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-[background-color,border-color] duration-200 ease-out hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send Message <Send className="size-4" />
              </button>
            </form>
          </Card>
        </div>

        <figure className="mt-8 rounded-xl border border-black/[0.05] bg-black/[0.005] px-6 py-5 text-center dark:border-white/[0.06] dark:bg-white/[0.02]">
          <blockquote className="font-sans text-sm leading-[1.7] text-muted-foreground">
            Drop by drop is the water pot filled. Likewise, the wise person
            accumulates excellence gradually.
          </blockquote>
          <figcaption className="mt-3 font-sans text-xs text-muted-2">
            Buddha
          </figcaption>
        </figure>

        <div className="mt-4 flex items-center justify-center rounded-xl border border-black/[0.05] bg-black/[0.005] px-6 py-4 font-sans text-sm text-muted-foreground dark:border-white/[0.06] dark:bg-white/[0.02]">
          You are the <strong className="px-1 text-foreground">13,640</strong>
          th visitor
        </div>
      </section>
    </Reveal>
  );
}
