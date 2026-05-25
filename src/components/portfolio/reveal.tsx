import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealStyle = CSSProperties & { "--delay"?: string };

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("reveal", className)}
      style={{ "--delay": `${delay}ms` } as RevealStyle}
    >
      {children}
    </div>
  );
}
