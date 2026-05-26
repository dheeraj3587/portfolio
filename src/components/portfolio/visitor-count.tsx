"use client";

import { useEffect, useState } from "react";

const COUNT_API_BASE = "https://api.countapi.xyz";
const COUNT_NAMESPACE = "dheeraj-portfolio";
const COUNT_KEY = "visitors";
const COUNTED_STORAGE_KEY = "portfolio:visitor-counted";
const COUNT_CACHE_KEY = "portfolio:visitor-count";

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function VisitorCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let isActive = true;
    const counted = window.localStorage.getItem(COUNTED_STORAGE_KEY) === "true";
    const endpoint = counted
      ? `${COUNT_API_BASE}/get/${COUNT_NAMESPACE}/${COUNT_KEY}`
      : `${COUNT_API_BASE}/hit/${COUNT_NAMESPACE}/${COUNT_KEY}`;

    const update = async () => {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        const data = (await response.json()) as { value?: number };
        const value = Number(data.value);

        if (!Number.isFinite(value)) {
          throw new Error("Invalid visitor count response");
        }

        if (!isActive) {
          return;
        }

        setCount(value);
        window.localStorage.setItem(COUNT_CACHE_KEY, String(value));

        if (!counted) {
          window.localStorage.setItem(COUNTED_STORAGE_KEY, "true");
        }
      } catch {
        const cached = window.localStorage.getItem(COUNT_CACHE_KEY);
        if (cached && isActive) {
          setCount(Number(cached));
        }
      }
    };

    update();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="mt-5 flex items-center justify-center rounded-xl border border-black/[0.05] bg-black/[0.005] px-7 py-5 font-sans text-base text-muted-foreground dark:border-white/[0.06] dark:bg-white/[0.02]">
      You are the{" "}
      <strong className="px-1 text-foreground">
        {count !== null ? formatCount(count) : "..."}
      </strong>
      th visitor
    </div>
  );
}
