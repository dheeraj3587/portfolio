import { Mail } from "lucide-react";
import { footerLinks, profile, socialLinks } from "@/lib/portfolio-data";
import { GitHubIcon, LinkedInIcon } from "./brand-icons";

const SOCIAL_LINK_CLASS =
  "text-muted-2 transition-colors duration-150 hover:text-foreground";

export function SiteFooter() {
  return (
    <footer className="mt-16 flex flex-col gap-8 border-t border-border py-12 text-sm text-muted-2 sm:mt-24 sm:text-base md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-6 font-sans">
        <p>© 2026 {profile.shortName}.</p>
        {footerLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="transition-colors duration-200 hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <a
          aria-label="LinkedIn profile"
          href={socialLinks.linkedin}
          target="_blank"
          rel="noreferrer"
          className={SOCIAL_LINK_CLASS}
        >
          <LinkedInIcon className="size-6" />
        </a>
        <a
          aria-label="Email"
          href={socialLinks.email}
          className={SOCIAL_LINK_CLASS}
        >
          <Mail className="size-6" />
        </a>
        <a
          aria-label="GitHub profile"
          href={socialLinks.github}
          target="_blank"
          rel="noreferrer"
          className={SOCIAL_LINK_CLASS}
        >
          <GitHubIcon className="size-6" />
        </a>
      </div>
    </footer>
  );
}
