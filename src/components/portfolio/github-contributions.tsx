"use client";

import { use } from "react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
  type Activity,
} from "@/components/ui/contribution-graph";

export function GitHubContributions({
  contributions,
  className,
}: {
  contributions: Promise<Activity[]>;
  className?: string;
}) {
  const data = use(contributions);

  return (
    <TooltipProvider delayDuration={0} disableHoverableContent>
      <ContributionGraph
        className={cn("mx-auto py-3", className)}
        data={data}
        blockSize={13.5}
        blockMargin={4}
        blockRadius={2.5}
        fontSize={11}
        labels={{
          months: ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY"],
          legend: {
            less: "LESS",
            more: "MORE",
          },
        }}
      >
        <ContributionGraphCalendar
          className="contribution-scroll px-2"
          title="GitHub Contributions"
        >
          {({ activity, dayIndex, weekIndex }) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <g>
                  <ContributionGraphBlock
                    activity={activity}
                    dayIndex={dayIndex}
                    weekIndex={weekIndex}
                  />
                </g>
              </TooltipTrigger>
              <TooltipContent className="font-sans text-xs">
                <p>
                  {activity.count} contribution
                  {activity.count === 1 ? "" : "s"} on{" "}
                  {format(new Date(activity.date), "dd.MM.yyyy")}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </ContributionGraphCalendar>
        <ContributionGraphFooter className="px-2 mt-3 flex items-center justify-between text-[11px] font-mono tracking-[0.2em] uppercase text-neutral-400 dark:text-neutral-500">
          <ContributionGraphTotalCount>
            {({ totalCount, year }) => (
              <div className="font-semibold text-[#111111]/80 dark:text-white/80">
                {totalCount} CONTRIBUTIONS · {year}–{(year + 1).toString().slice(-2)}
              </div>
            )}
          </ContributionGraphTotalCount>
          <ContributionGraphLegend className="text-[11px] font-mono tracking-[0.2em] uppercase text-neutral-400 dark:text-neutral-500" />
        </ContributionGraphFooter>
      </ContributionGraph>
    </TooltipProvider>
  );
}

export function GitHubContributionsFallback() {
  return (
    <div className="flex h-40 w-full items-center justify-center">
      <Spinner className="text-muted-foreground" />
    </div>
  );
}
