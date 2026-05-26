import { ThemeToggle } from "@/components/theme-toggle";
import { navItems } from "@/lib/portfolio-data";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="nav-fade pointer-events-none absolute inset-x-0 top-0 h-20 bg-background" />
      <nav className="relative w-full">
        <div className="relative mx-auto flex h-20 max-w-5xl items-center justify-between px-8 lg:px-0">
          <div className="flex items-center gap-7 font-sans text-base text-muted-2 md:gap-8">
            {navItems.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "relative font-sans text-base transition-colors after:absolute after:-bottom-px after:left-0 after:h-px after:w-0 after:bg-current after:transition-[width] hover:text-foreground md:hover:after:w-full",
                  index === 0 && "text-foreground",
                )}
              >
                {item.label}
              </a>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
