import { Globe2, Mail, MapPin, UserRound, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GithubCalendar } from "@/components/ui/github-calendar";
import { profile, socialLinks, techStack } from "@/lib/portfolio-data";
import { Info } from "./info";
import { Reveal } from "./reveal";
import { SectionLabel } from "./section-label";
import { GitHubIcon, TechIcon } from "./tech-icon";

export function ProfileSection() {
  return (
    <section id="home">
      <Reveal>
        <div className="mb-7 flex items-center gap-4">
          <Avatar className="size-15 rounded-xl border border-border sm:size-16">
            <AvatarFallback className="rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 text-lg font-semibold tracking-tight text-zinc-600 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-300">
              {profile.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="font-sans text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl md:text-[2rem]">
              {profile.name}
            </h1>
            <div className="role-window mt-0.5 font-sans text-sm font-medium text-muted-2 sm:text-[15px]">
              <div className="role-track">
                {profile.roles.map((role, index) => (
                  <span key={`${role}-${index}`}>{role}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="mb-6 mt-10 flex flex-wrap items-start gap-x-8 gap-y-4">
          <Info
            label="Location"
            icon={<MapPin className="size-[13px]" />}
            value={profile.location}
          />
          <Info
            label="Email"
            icon={<Mail className="size-[13px]" />}
            value={profile.email}
          />
          <Info
            label="Pronouns"
            icon={<UserRound className="size-[13px]" />}
            value={profile.pronouns}
          />
        </div>
      </Reveal>

      <Reveal delay={140}>
        <div
          id="about"
          className="mb-8 max-w-2xl font-sans text-[13.5px] font-[450] leading-[1.85] text-muted-foreground sm:text-[15px]"
        >
          <p>
            I build Android apps end-to-end, obsessing over the details that
            make mobile experiences feel right to use. Currently working with{" "}
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
              href="https://dev.java/"
              target="_blank"
              rel="noreferrer"
            >
              Java
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
            , and{" "}
            <a
              className="text-foreground underline-offset-2 hover:underline"
              href="https://firebase.google.com/"
              target="_blank"
              rel="noreferrer"
            >
              Firebase
            </a>
            .
          </p>
        </div>
      </Reveal>

      <Reveal delay={200}>
        <div className="mb-8 flex h-5 items-center gap-2 font-sans text-[12px] text-muted-foreground sm:text-[13px]">
          <SpotifyIcon />
          <span className="font-medium text-foreground">Now Playing</span>
          <span className="text-muted-2">-</span>
          <span>bad guy · Billie Eilish</span>
        </div>
      </Reveal>

      <Reveal delay={240}>
        <div className="mb-6 flex flex-wrap items-center gap-4 text-muted-2">
          <a
            aria-label="X profile"
            href={socialLinks.x}
            target="_blank"
            rel="noreferrer"
            className="text-[#737373] transition-colors duration-150 hover:text-[#111111] dark:text-[#a0a0a0] dark:hover:text-[#f0f0f0]"
          >
            <X className="size-[18px]" />
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
          <a
            aria-label="Website"
            href={socialLinks.website}
            target="_blank"
            rel="noreferrer"
            className="text-[#737373] transition-colors duration-150 hover:text-[#111111] dark:text-[#a0a0a0] dark:hover:text-[#f0f0f0]"
          >
            <Globe2 className="size-[18px]" />
          </a>
          <a
            aria-label="Email"
            href={socialLinks.email}
            className="text-[#737373] transition-colors duration-150 hover:text-[#111111] dark:text-[#a0a0a0] dark:hover:text-[#f0f0f0]"
          >
            <Mail className="size-[18px]" />
          </a>
        </div>
      </Reveal>

      <Reveal delay={300}>
        <div className="contribution-scroll -mx-6 mt-10 overflow-x-auto sm:mx-0 sm:overflow-visible">
          <div className="min-w-[580px] px-6 sm:min-w-0 sm:px-0">
            <GithubCalendar
              username={profile.githubUsername}
              colorSchema="gray"
            />
          </div>
        </div>
      </Reveal>

      <Reveal delay={360} className="mt-12">
        <section id="components">
          <SectionLabel>Tech Stack</SectionLabel>
          <div className="flex flex-wrap items-center gap-3 opacity-95 sm:gap-4">
            {techStack.map((tech) => (
              <TechIcon key={tech.id} id={tech.id} />
            ))}
          </div>
        </section>
      </Reveal>
    </section>
  );
}

function SpotifyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5 shrink-0 text-[#1db954]"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 1.75A10.25 10.25 0 1 0 12 22.25 10.25 10.25 0 0 0 12 1.75Zm4.7 14.78a.76.76 0 0 1-1.05.25c-2.87-1.75-6.48-2.15-10.74-1.18a.76.76 0 1 1-.34-1.48c4.66-1.06 8.66-.6 11.88 1.36.36.22.47.69.25 1.05Zm1.25-2.78a.94.94 0 0 1-1.29.31c-3.28-2.02-8.28-2.6-12.16-1.42a.94.94 0 1 1-.55-1.8c4.43-1.35 9.93-.7 13.69 1.6.44.27.58.86.31 1.31Zm.11-2.9c-3.93-2.33-10.42-2.55-14.18-1.41a1.13 1.13 0 0 1-.66-2.17c4.32-1.31 11.48-1.05 16 1.63a1.13 1.13 0 0 1-1.16 1.95Z" />
    </svg>
  );
}
