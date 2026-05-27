import { experience, techById } from "@/lib/portfolio-data";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { SectionLabel } from "./section-label";
import { TechIcon } from "./tech-icon";

export function ExperienceSection() {
  return (
    <Reveal delay={160} className="mt-16">
      <section id="experience">
        <SectionLabel>Experience</SectionLabel>
        <div className="relative">
          <div
            className="absolute bottom-2 left-[3px] top-2 w-px bg-border"
            aria-hidden="true"
          />
          <ol className="space-y-12">
            {experience.map((item) => (
              <li
                key={`${item.role}-${item.company}`}
                className="relative pl-7"
              >
                <span
                  className={cn(
                    "absolute left-0 top-[7px] size-[7px] rounded-full",
                    item.active
                      ? "bg-success ring-4 ring-emerald-400/15 status-dot"
                      : "bg-zinc-400 dark:bg-zinc-500",
                  )}
                  aria-hidden="true"
                />

                {/* Two-column lockup: role/body on left, location/date on right */}
                <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-12">
                  {/* Left column — role, company, body, bullets */}
                  <div className="md:col-span-8">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <h3 className="font-sans text-lg font-medium tracking-tight text-foreground sm:text-xl">
                        {item.role}
                      </h3>
                      <span className="text-muted-2">·</span>
                      <span className="font-sans text-[15px] font-[450] text-muted-foreground sm:text-base">
                        {item.company}
                      </span>
                    </div>
                    <p className="mt-3 font-sans text-base font-[450] leading-[1.7] text-muted-foreground sm:text-[17px]">
                      {item.body}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {item.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-3 font-sans text-[15px] font-[450] leading-[1.65] text-muted-foreground sm:text-base"
                        >
                          <span className="mt-[9px] size-[3px] shrink-0 rounded-full bg-muted-2" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right column — date and location */}
                  <div className="md:col-span-4 md:text-right">
                    <div className="font-sans text-[13px] font-medium tabular-nums text-foreground sm:text-sm">
                      {item.date}
                    </div>
                    <div className="mt-1 font-sans text-sm text-muted-2">
                      {item.location}
                    </div>
                  </div>
                </div>

                {/* Stack chips full width below */}
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {item.stack.map((id) => {
                    const tech = techById.get(id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 font-sans text-[13px] font-medium text-muted-foreground"
                      >
                        <TechIcon id={id} size="sm" showLabel={false} />
                        {tech?.name ?? id}
                      </span>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </Reveal>
  );
}
