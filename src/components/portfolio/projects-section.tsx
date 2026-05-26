import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { projects } from "@/lib/portfolio-data";
import { Reveal } from "./reveal";
import { SectionLabel } from "./section-label";
import { GitHubIcon, TechIcon } from "./tech-icon";

function ProjectCard({ project }: { project: (typeof projects)[number] }) {
  return (
    <Card className="group gap-0 overflow-hidden rounded-xl border border-black/[0.05] bg-black/[0.005] py-0 text-foreground shadow-none transition-[border-color,background-color,transform] duration-200 ease-out dark:border-white/[0.06] dark:bg-white/[0.02]">
      <div className="relative aspect-video w-full overflow-hidden rounded-t-xl border-b border-border">
        <Image
          src={project.image}
          alt={`${project.title} preview`}
          fill
          sizes="(max-width: 768px) 100vw, 384px"
          className="object-cover"
        />
      </div>
      <div className="px-6 py-6 sm:px-7 sm:py-7">
        <div className="mb-2 flex items-start justify-between">
          <CardTitle className="font-sans text-lg font-medium tracking-tight text-foreground sm:text-xl">
            {project.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {project.links.github ? (
              <a
                href={project.links.github}
                target="_blank"
                rel="noreferrer"
                aria-label={`${project.title} GitHub`}
                title="View on GitHub"
                className="text-zinc-500 transition-colors duration-150 hover:text-zinc-200 dark:text-[#737373] dark:hover:text-[#e0e0e0]"
              >
                <GitHubIcon className="size-[18px]" />
              </a>
            ) : null}
            {project.links.site ? (
              <a
                href={project.links.site}
                target="_blank"
                rel="noreferrer"
                aria-label={`${project.title} website`}
                title="Visit website"
                className="text-zinc-500 transition-colors duration-150 hover:text-zinc-200 dark:text-[#737373] dark:hover:text-[#e0e0e0]"
              >
                <ExternalLink className="size-5" />
              </a>
            ) : null}
          </div>
        </div>
        <CardDescription className="mb-6 max-w-[24rem] font-sans text-[15px] leading-[1.75] font-[450] text-muted-foreground sm:text-base dark:text-[#b2b2b2]">
          {project.description}
        </CardDescription>
        <div className="mt-auto flex flex-wrap items-center gap-3 opacity-95">
          {project.stack.map((item) => (
            <TechIcon key={item} id={item} size="sm" />
          ))}
        </div>
      </div>
    </Card>
  );
}

export function ProjectsSection() {
  return (
    <Reveal delay={120} className="mt-14">
      <section id="projects">
        <SectionLabel>Featured Projects</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>
      </section>
    </Reveal>
  );
}
