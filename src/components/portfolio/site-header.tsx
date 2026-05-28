"use client";

import { useEffect, useState } from "react";
import { PaletteSwatcher } from "@/components/portfolio/palette-swatcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { navItems } from "@/lib/portfolio-data";
import { cn } from "@/lib/utils";

const SECTION_IDS = navItems.map((item) => item.href.replace("#", ""));

export function SiteHeader() {
  const [activeId, setActiveId] = useState<string>(SECTION_IDS[0] ?? "home");

  useEffect(() => {
    let raf: number | null = null;

    const compute = () => {
      const mid = window.scrollY + window.innerHeight * 0.4;
      let next = SECTION_IDS[0] ?? "home";
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.offsetTop <= mid) next = id;
      }
      setActiveId(next);
    };

    const onScroll = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(() => {
        compute();
        raf = null;
      });
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="nav-fade pointer-events-none absolute inset-x-0 top-0 h-20 bg-background" />
      <nav className="relative w-full">
        <div className="relative mx-auto flex h-20 max-w-5xl items-center justify-between px-6 sm:px-10 lg:px-12">
          <div className="flex items-center gap-7 font-sans text-base text-muted-2 md:gap-8">
            {navItems.map((item) => {
              const id = item.href.replace("#", "");
              const isActive = activeId === id;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative font-sans text-base transition-colors after:absolute after:-bottom-px after:left-0 after:h-px after:w-0 after:bg-current after:transition-[width] hover:text-foreground md:hover:after:w-full",
                    isActive && "text-foreground md:after:w-full",
                  )}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            {/* Palette_Swatcher is reachable from the Site_Header on viewports
                ≥768px (Requirement 11.2). On narrower viewports the swatcher
                is surfaced via Scroll_Island_Nav instead. The existing
                ThemeToggle entry point and persistence are preserved
                (Requirement 12.3). */}
            <div className="hidden items-center md:flex">
              <PaletteSwatcher layout="header" />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
}
