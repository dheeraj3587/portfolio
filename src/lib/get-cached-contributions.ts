import { unstable_cache } from "next/cache";

import type { Activity } from "@/components/ui/contribution-graph";

type GitHubContributionsResponse = {
  contributions?: Activity[];
};

/**
 * Fetches and caches GitHub contributions for the given username.
 *
 * Wrapped in try/catch — if the upstream API is down or the response is
 * malformed, we return an empty array rather than crashing the page render
 * (which is a Suspense boundary in `<ProfileSection />`).
 */
export const getCachedContributions = unstable_cache(
  async (username: string): Promise<Activity[]> => {
    const baseUrl =
      process.env.GITHUB_CONTRIBUTIONS_API_URL ||
      "https://github-contributions-api.jogruber.de";

    try {
      const res = await fetch(`${baseUrl}/v4/${username}?y=last`, {
        next: { revalidate: 86400 },
      });

      if (!res.ok) return [];

      const data = (await res.json()) as GitHubContributionsResponse;
      return Array.isArray(data.contributions) ? data.contributions : [];
    } catch {
      return [];
    }
  },
  ["github-contributions"],
  { revalidate: 86400 }, // Cache for 1 day
);
