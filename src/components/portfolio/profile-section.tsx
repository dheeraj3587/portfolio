import { Suspense } from "react";
import { Globe2, Mail, MapPin, UserRound } from "lucide-react";
import {
  AvatarFallback,
  LiquidMetalAvatar,
} from "@/components/ui/liquid-metal-avatar";
import {
  GitHubContributions,
  GitHubContributionsFallback,
} from "@/components/portfolio/github-contributions";
import { getCachedContributions } from "@/lib/get-cached-contributions";
import { profile, socialLinks, techStack } from "@/lib/portfolio-data";
import { Reveal } from "./reveal";
import { SectionLabel } from "./section-label";
import { GitHubIcon, LinkedInIcon } from "./brand-icons";
import { TechIcon } from "./tech-icon";

export function ProfileSection() {
  const contributions = getCachedContributions(profile.githubUsername);

  return (
    <section id="home">

      {/* ── 1. Avatar + Name + Role ── */}
      <Reveal>
        <div className="mb-10 flex items-center gap-5">
          <LiquidMetalAvatar
            size="lg"
            className="size-[4.5rem] shrink-0 sm:size-20"
            aria-label={profile.name}
          >
            <AvatarFallback className="rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 text-2xl font-semibold tracking-tight text-zinc-600 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-300">
              {profile.initials}
            </AvatarFallback>
          </LiquidMetalAvatar>

          <div className="min-w-0">
            <h1
              data-morph-target="hero-name"
              className="font-sans text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl md:text-[3rem]"
            >
              {profile.shortName}
            </h1>
            <div className="role-window mt-1.5 font-sans text-base font-medium text-muted-2 sm:text-lg">
              <div className="role-track">
                {profile.roles.map((role, index) => (
                  <span key={`${role}-${index}`}>{role}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── 2. LOCATION / EMAIL / PRONOUNS — three columns ── */}
      <Reveal delay={80}>
        <div className="mb-10 flex flex-wrap gap-x-12 gap-y-5 sm:gap-x-16">
          <MetaCol
            label="Location"
            icon={<MapPin className="size-[15px]" />}
            value={profile.location}
          />
          <MetaCol
            label="Email"
            icon={<Mail className="size-[15px]" />}
            value={profile.email}
            href={socialLinks.email}
          />
          <MetaCol
            label="Pronouns"
            icon={<UserRound className="size-[15px]" />}
            value={profile.pronouns}
          />
        </div>
      </Reveal>

      {/* ── 3. Bio ── */}
      <Reveal delay={140}>
        <p
          id="about"
          className="mb-10 scroll-mt-32 font-sans text-base font-[450] leading-[1.85] text-muted-foreground sm:text-lg"
        >
          I build Android apps and backend services end-to-end, obsessing over
          the details that make software feel right to use. Currently working
          with{" "}
          <a
            className="text-foreground underline-offset-2 hover:underline"
            href="https://kotlinlang.org/"
            target="_blank"
            rel="noreferrer"
          >
            Kotlin
          </a>
          ,{" "}
          <a
            className="text-foreground underline-offset-2 hover:underline"
            href="https://developer.android.com/jetpack/compose"
            target="_blank"
            rel="noreferrer"
          >
            Jetpack Compose
          </a>
          ,{" "}
          <a
            className="text-foreground underline-offset-2 hover:underline"
            href="https://spring.io/projects/spring-boot"
            target="_blank"
            rel="noreferrer"
          >
            Spring Boot
          </a>
          , and{" "}
          <a
            className="text-foreground underline-offset-2 hover:underline"
            href="https://www.postgresql.org/"
            target="_blank"
            rel="noreferrer"
          >
            PostgreSQL
          </a>
          .
        </p>
      </Reveal>

      {/* ── 4. DSA stats line ── */}
      <Reveal delay={200}>
        <div className="mb-8 flex items-center gap-3 font-sans text-sm text-muted-foreground sm:text-base">
          <CodeIcon />
          <span className="font-medium text-foreground">500+ DSA solved</span>
          <span className="text-muted-2">—</span>
          <a
            href={socialLinks.leetcode}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            LeetCode · @Dheeraj031224
          </a>
          <span className="hidden text-muted-2 sm:inline">·</span>
          <a
            href={socialLinks.codeforces}
            target="_blank"
            rel="noreferrer"
            className="hidden hover:text-foreground sm:inline"
          >
            Codeforces · @joshidheeraj8782
          </a>
        </div>
      </Reveal>

      {/* ── 5. Social icons ── */}
      <Reveal delay={240}>
        <div className="mb-8 flex items-center gap-5">
          <a
            aria-label="GitHub profile"
            href={socialLinks.github}
            target="_blank"
            rel="noreferrer"
            className="text-muted-2 transition-colors duration-150 hover:text-foreground"
          >
            <GitHubIcon className="size-6" />
          </a>
          <a
            aria-label="LinkedIn profile"
            href={socialLinks.linkedin}
            target="_blank"
            rel="noreferrer"
            className="text-muted-2 transition-colors duration-150 hover:text-foreground"
          >
            <LinkedInIcon className="size-6" />
          </a>
          <a
            aria-label="LeetCode profile"
            href={socialLinks.leetcode}
            target="_blank"
            rel="noreferrer"
            className="text-muted-2 transition-colors duration-150 hover:text-foreground"
          >
            <Globe2 className="size-6" />
          </a>
          <a
            aria-label="Email"
            href={socialLinks.email}
            className="text-muted-2 transition-colors duration-150 hover:text-foreground"
          >
            <Mail className="size-6" />
          </a>
        </div>
      </Reveal>

      {/* ── GitHub contributions ── */}
      <Reveal delay={300}>
        <div className="-mx-6 mt-12 sm:-mx-10 lg:-mx-12">
          <Suspense fallback={<GitHubContributionsFallback />}>
            <GitHubContributions contributions={contributions} />
          </Suspense>
        </div>
      </Reveal>

      {/* ── Tech Stack ── */}
      <Reveal delay={360} className="mt-16">
        <div id="components">
          <SectionLabel>Tech Stack</SectionLabel>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-6 sm:gap-x-7">
            {techStack.map((tech) => (
              <TechIcon key={tech.id} id={tech.id} />
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/** Three-column meta item: label on top, icon + value below */
function MetaCol({
  label,
  icon,
  value,
  href,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  href?: string;
}) {
  const valueNode = (
    <div className="flex items-center gap-2 font-sans text-base font-medium text-muted-foreground sm:text-lg">
      <span className="text-muted-2">{icon}</span>
      {value}
    </div>
  );

  return (
    <div className="space-y-1">
      <p className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-muted-2 sm:text-[13px]">
        {label}
      </p>
      {href ? (
        <a
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noreferrer" : undefined}
          className="transition-opacity hover:opacity-70"
        >
          {valueNode}
        </a>
      ) : (
        valueNode
      )}
    </div>
  );
}

function CodeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0 text-emerald-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
