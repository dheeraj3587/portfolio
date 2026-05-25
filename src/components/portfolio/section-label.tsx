import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 text-xs font-mono uppercase tracking-widest text-muted-2">
      {children}
    </h2>
  );
}
