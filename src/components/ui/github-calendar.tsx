import { cn } from "@/lib/utils";

interface ContributionDay {
  color: string;
  contributionCount: number;
  contributionLevel:
    | "NONE"
    | "FIRST_QUARTILE"
    | "SECOND_QUARTILE"
    | "THIRD_QUARTILE"
    | "FOURTH_QUARTILE";
  date: string;
}

interface GithubContributionData {
  contributions: ContributionDay[][];
  totalContributions: number;
}

interface GithubCalendarProps {
  username: string;
  variant?: "default" | "city-lights" | "minimal";
  shape?: "square" | "rounded" | "circle" | "squircle";
  glowIntensity?: number;
  className?: string;
  showTotal?: boolean;
  colorSchema?: "green" | "blue" | "purple" | "orange" | "gray";
}

const colorSchemas = {
  gray: {
    level0: "bg-zinc-100 dark:bg-zinc-900",
    level1: "bg-zinc-300 dark:bg-zinc-800",
    level2: "bg-zinc-400 dark:bg-zinc-700",
    level3: "bg-zinc-600 dark:bg-zinc-500",
    level4: "bg-zinc-800 dark:bg-zinc-300",
  },
  green: {
    level0: "bg-zinc-100 dark:bg-zinc-900",
    level1: "bg-emerald-200 dark:bg-emerald-900",
    level2: "bg-emerald-300 dark:bg-emerald-700",
    level3: "bg-emerald-400 dark:bg-emerald-500",
    level4: "bg-emerald-500 dark:bg-emerald-400",
  },
  blue: {
    level0: "bg-zinc-100 dark:bg-zinc-900",
    level1: "bg-blue-200 dark:bg-blue-900",
    level2: "bg-blue-300 dark:bg-blue-700",
    level3: "bg-blue-400 dark:bg-blue-500",
    level4: "bg-blue-500 dark:bg-blue-400",
  },
  purple: {
    level0: "bg-zinc-100 dark:bg-zinc-900",
    level1: "bg-purple-200 dark:bg-purple-900",
    level2: "bg-purple-300 dark:bg-purple-700",
    level3: "bg-purple-400 dark:bg-purple-500",
    level4: "bg-purple-500 dark:bg-purple-400",
  },
  orange: {
    level0: "bg-zinc-100 dark:bg-zinc-900",
    level1: "bg-orange-200 dark:bg-orange-900",
    level2: "bg-orange-300 dark:bg-orange-700",
    level3: "bg-orange-400 dark:bg-orange-500",
    level4: "bg-orange-500 dark:bg-orange-400",
  },
};

function getLevelClass(
  level: string,
  schema: keyof typeof colorSchemas = "green",
) {
  const s = colorSchemas[schema];
  switch (level) {
    case "FIRST_QUARTILE":
      return s.level1;
    case "SECOND_QUARTILE":
      return s.level2;
    case "THIRD_QUARTILE":
      return s.level3;
    case "FOURTH_QUARTILE":
      return s.level4;
    case "NONE":
    default:
      return s.level0;
  }
}

function getShapeClass(shape: string) {
  switch (shape) {
    case "circle":
      return "rounded-full";
    case "square":
      return "rounded-none";
    case "squircle":
      return "rounded-sm";
    case "rounded":
    default:
      return "rounded-[2px]";
  }
}

function getMonthLabels(weeks: ContributionDay[][]) {
  const firstDate = weeks[0]?.[0]?.date;
  if (!firstDate) return [];

  const startDate = new Date(firstDate);
  return Array.from({ length: 12 }, (_, index) => {
    const current = new Date(startDate);
    current.setMonth(startDate.getMonth() + index);

    return {
      key: current.toISOString(),
      label: current.toLocaleString("en", { month: "short" }),
    };
  });
}

function getYearLabel(weeks: ContributionDay[][]) {
  const firstDate = weeks[0]?.[0]?.date;
  const lastWeek = weeks[weeks.length - 1];
  const lastDate = lastWeek?.[lastWeek.length - 1]?.date;

  if (!firstDate || !lastDate) return "";

  const startYear = new Date(firstDate).getFullYear();
  const endYear = new Date(lastDate).getFullYear();

  if (startYear === endYear) {
    return `${startYear}`;
  }

  return `${startYear}–${String(endYear).slice(-2)}`;
}

function getGlowColor(colorSchema: keyof typeof colorSchemas) {
  switch (colorSchema) {
    case "blue":
      return "#3b82f6";
    case "purple":
      return "#a855f7";
    case "orange":
      return "#f97316";
    case "gray":
      return "#a1a1aa";
    case "green":
    default:
      return "#10b981";
  }
}

function buildFallbackData(): GithubContributionData {
  const today = new Date();
  const firstDay = new Date(today);
  firstDay.setDate(today.getDate() - 51 * 7 - today.getDay());

  const contributions = Array.from({ length: 52 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(firstDay);
      date.setDate(firstDay.getDate() + weekIndex * 7 + dayIndex);

      return {
        color: "",
        contributionCount: 0,
        contributionLevel: "NONE" as const,
        date: date.toISOString().slice(0, 10),
      };
    }),
  );

  return {
    contributions,
    totalContributions: 0,
  };
}

async function getContributionData(username: string) {
  if (!username) return buildFallbackData();

  try {
    const response = await fetch(
      `https://github-contributions-api.deno.dev/${username}.json`,
      {
        next: { revalidate: 60 * 60 * 6 },
        signal: AbortSignal.timeout(1600),
      },
    );

    if (!response.ok) return buildFallbackData();

    return (await response.json()) as GithubContributionData;
  } catch {
    return buildFallbackData();
  }
}

export async function GithubCalendar({
  username,
  variant = "default",
  shape = "rounded",
  glowIntensity = 5,
  className,
  showTotal = true,
  colorSchema = "green",
}: GithubCalendarProps) {
  const data = await getContributionData(username);
  const weeks = data.contributions;
  const monthLabels = getMonthLabels(weeks);
  const yearLabel = getYearLabel(weeks);
  const shapeClass = getShapeClass(shape);
  const isMinimal = variant === "minimal";
  const glowColor = getGlowColor(colorSchema);
  const legendLevels: ContributionDay["contributionLevel"][] = [
    "NONE",
    "FIRST_QUARTILE",
    "SECOND_QUARTILE",
    "THIRD_QUARTILE",
    "FOURTH_QUARTILE",
  ];

  return (
    <div className={cn("w-full", className)}>
      <div className="min-w-[560px]">
        {monthLabels.length > 0 ? (
          <div className="mb-2 grid grid-cols-12 pl-3 text-[10px] uppercase tracking-[0.14em] text-muted-2">
            {monthLabels.map((month) => (
              <span key={month.key}>{month.label}</span>
            ))}
          </div>
        ) : null}

        <div className="relative flex w-full flex-nowrap gap-[3px]">
          {weeks.map((week) => (
            <div
              key={week.map((day) => day.date).join(":")}
              className="flex flex-1 flex-col gap-[3px]"
            >
              {week.map((day) => {
                const isGlowing =
                  variant === "city-lights" && day.contributionCount > 0;

                return (
                  <span
                    key={day.date}
                    aria-label={`${day.contributionCount} contributions on ${day.date}`}
                    title={`${day.contributionCount} contributions on ${day.date}`}
                    className={cn(
                      "aspect-square w-full transition-colors duration-150",
                      getLevelClass(day.contributionLevel, colorSchema),
                      isGlowing && "z-10",
                      shapeClass,
                      isMinimal && "scale-75 rounded-full",
                    )}
                    style={
                      isGlowing
                        ? {
                            boxShadow: `0 0 ${glowIntensity}px ${glowColor}`,
                          }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>

        {showTotal ? (
          <div className="mt-4 flex items-center justify-between gap-6">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-2">
              {data.totalContributions} contributions
              {yearLabel ? ` · ${yearLabel}` : ""}
            </p>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-2">
              Less
              <span className="inline-flex gap-1">
                {legendLevels.map((level) => (
                  <span
                    key={level}
                    className={cn(
                      "size-[11px] rounded-[2px]",
                      getLevelClass(level, colorSchema),
                    )}
                  />
                ))}
              </span>
              More
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
