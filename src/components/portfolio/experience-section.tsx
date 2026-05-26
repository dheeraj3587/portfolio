import { experience } from "@/lib/portfolio-data";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { SectionLabel } from "./section-label";
import { TechIcon } from "./tech-icon";

export function ExperienceSection() {
  return (
    <Reveal delay={160} className="mt-14">
      <section id="experience">
        <SectionLabel>Experience</SectionLabel>
        <div className="relative">
          <div
            className="absolute bottom-2 left-[3px] top-2 w-px bg-border"
            aria-hidden="true"
          />
          <ol className="space-y-8">
            {experience.map((item) => (
              <li key={`${item.role}-${item.company}`} className="relative pl-7">
                <span
                  className={cn(
                    "absolute left-0 top-[7px] size-[7px] rounded-full",
                    item.active
                      ? "bg-success ring-4 ring-emerald-400/15"
                      : "bg-zinc-400 dark:bg-zinc-500",
                  )}
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="font-sans text-lg font-medium tracking-tight text-foreground sm:text-xl">
                      {item.role}
                    </h3>
                    <span className="text-muted-2">·</span>
                    <span className="font-sans text-[15px] font-[450] text-muted-foreground sm:text-base">
                      {item.company}
                    </span>
                  </div>
                  <span className="whitespace-nowrap text-[13px] font-medium tabular-nums text-foreground sm:text-sm">
                    {item.date}
                  </span>
                </div>
                <div className="mt-1 font-sans text-sm text-muted-2 sm:text-[15px]">
                  {item.location}
                </div>
                <p className="mt-3 font-sans text-base leading-[1.7] font-[450] text-muted-foreground sm:text-lg">
                  {item.body}
                </p>
                <ul className="mt-2 space-y-1">
                  {item.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-3 font-sans text-[15px] leading-[1.6] font-[450] text-muted-foreground sm:text-base"
                    >
                      <span className="mt-[8.5px] size-[3px] shrink-0 rounded-full bg-muted-2" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {item.stack.map((stackItem) => (
                    <TechIcon key={stackItem} id={stackItem} size="sm" />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </Reveal>
  );
}
