"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type RevealStyle = CSSProperties & { "--reveal-delay"?: string };

type RevealTag = "div" | "section" | "article" | "li";

const supportsObserver =
  typeof window !== "undefined" && typeof IntersectionObserver !== "undefined";

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: RevealTag;
  once?: boolean;
}) {
  // Ref accepts any element type so we can attach to div/section/article/li.
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(!supportsObserver);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  const classes = cn("reveal", visible && "is-visible", className);
  const style = { "--reveal-delay": `${delay}ms` } as RevealStyle;

  // Callback ref used to bridge across heterogeneous element types
  // without fighting TypeScript's strict element-specific ref types.
  const setRef = (node: HTMLElement | null) => {
    ref.current = node;
  };

  switch (as) {
    case "section":
      return (
        <section ref={setRef} className={classes} style={style}>
          {children}
        </section>
      );
    case "article":
      return (
        <article ref={setRef} className={classes} style={style}>
          {children}
        </article>
      );
    case "li":
      return (
        <li ref={setRef} className={classes} style={style}>
          {children}
        </li>
      );
    default:
      return (
        <div ref={setRef} className={classes} style={style}>
          {children}
        </div>
      );
  }
}
