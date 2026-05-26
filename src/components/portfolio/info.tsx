import type { ReactNode } from "react";

export function Info({
  label,
  icon,
  value,
}: {
  label: string;
  icon: ReactNode;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <div className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-muted-2 sm:text-[13px]">
        {label}
      </div>
      <div className="flex items-center gap-2.5 font-sans text-base font-medium text-muted-foreground sm:text-lg">
        <span className="text-muted-2">{icon}</span>
        {value}
      </div>
    </div>
  );
}
