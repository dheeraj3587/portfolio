import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-6 font-mono text-sm uppercase tracking-[0.18em] text-muted-2">
      {children}
    </h2>
  );
}
