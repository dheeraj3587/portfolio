"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

type ThemeTransition = {
  name: string;
  css: string;
};

const STYLE_ID = "theme-transition-styles";

const createThemeTransition = (): ThemeTransition => ({
  name: "circle-center",
  css: `
    ::view-transition-group(root) {
      animation-duration: 0.7s;
      animation-timing-function: var(--expo-out);
    }

    ::view-transition-new(root) {
      animation-name: reveal-light;
    }

    ::view-transition-old(root),
    .dark::view-transition-old(root) {
      animation: none;
      z-index: -1;
    }

    .dark::view-transition-new(root) {
      animation-name: reveal-dark;
    }

    @keyframes reveal-dark {
      from {
        clip-path: circle(0% at 50% 50%);
      }
      to {
        clip-path: circle(100% at 50% 50%);
      }
    }

    @keyframes reveal-light {
      from {
        clip-path: circle(0% at 50% 50%);
      }
      to {
        clip-path: circle(100% at 50% 50%);
      }
    }
  `,
});

const applyTransitionStyles = (css: string) => {
  if (typeof document === "undefined") return;

  let styleElement = document.getElementById(
    STYLE_ID,
  ) as HTMLStyleElement | null;

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = STYLE_ID;
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = css;
};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = useCallback(() => {
    if (typeof document === "undefined") return;

    const animation = createThemeTransition();
    applyTransitionStyles(animation.css);

    const currentTheme = resolvedTheme ?? "dark";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    const switchTheme = () => setTheme(nextTheme);

    const viewTransition = (
      document as Document & {
        startViewTransition?: (callback: () => void) => void;
      }
    ).startViewTransition?.bind(document);

    if (!viewTransition) {
      switchTheme();
      return;
    }

    viewTransition(switchTheme);
  }, [resolvedTheme, setTheme]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className="group size-9 rounded-md text-muted-2 transition-colors hover:bg-transparent hover:text-foreground"
    >
      <Sun className="hidden size-[17px] transition-transform duration-200 group-hover:rotate-12 dark:block" />
      <Moon className="size-[17px] transition-transform duration-200 group-hover:-rotate-12 dark:hidden" />
    </Button>
  );
}
