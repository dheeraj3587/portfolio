import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-6 text-base font-mono uppercase tracking-widest text-muted-2">
      {children}
    </h2>
  );
}
