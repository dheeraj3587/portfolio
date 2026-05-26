import { Mail, X } from "lucide-react";
import { footerLinks, profile, socialLinks } from "@/lib/portfolio-data";
import { GitHubIcon } from "./tech-icon";

export function SiteFooter() {
  return (
    <footer className="mt-16 flex flex-col gap-8 border-t border-border py-12 text-sm text-muted-2 sm:mt-24 sm:text-base md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-6 font-sans">
        <p>© 2026 {profile.name}.</p>
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
          aria-label="X profile"
          href={socialLinks.x}
          target="_blank"
          rel="noreferrer"
          className="text-[#737373] transition-colors duration-150 hover:text-[#111111] dark:text-[#a0a0a0] dark:hover:text-[#f0f0f0]"
        >
          <X className="size-6" />
        </a>
        <a
          aria-label="Email"
          href={socialLinks.email}
          className="text-[#737373] transition-colors duration-150 hover:text-[#111111] dark:text-[#a0a0a0] dark:hover:text-[#f0f0f0]"
        >
          <Mail className="size-6" />
        </a>
        <a
          aria-label="GitHub profile"
          href={socialLinks.github}
          target="_blank"
          rel="noreferrer"
          className="text-[#737373] transition-colors duration-150 hover:text-[#111111] dark:text-[#a0a0a0] dark:hover:text-[#f0f0f0]"
        >
          <GitHubIcon />
        </a>
      </div>
    </footer>
  );
}
