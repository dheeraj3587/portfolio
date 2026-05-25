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
      <div className="font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-muted-2 sm:text-[11px]">
        {label}
      </div>
      <div className="flex items-center gap-2 font-sans text-[13.5px] font-medium text-muted-foreground sm:text-[15px]">
        <span className="text-muted-2">{icon}</span>
        {value}
      </div>
    </div>
  );
}
