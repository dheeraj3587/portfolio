import type { ReactNode } from "react";

export function Info({
  label,
  icon,
  value,
  href,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-2.5 font-sans text-base font-medium text-muted-foreground sm:text-lg">
      <span className="text-muted-2">{icon}</span>
      {value}
    </div>
  );

  return (
    <div className="space-y-1">
      <div className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-muted-2 sm:text-[13px]">
        {label}
      </div>
      {href ? (
        <a
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noreferrer" : undefined}
          className="transition-opacity hover:opacity-70"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}
