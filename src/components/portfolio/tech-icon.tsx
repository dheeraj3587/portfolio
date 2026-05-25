import Image from "next/image";
import type { ComponentType, SVGProps } from "react";
import {
  Android,
  Bun,
  Cursor,
  ExpressJs,
  Figma,
  Github,
  Hono,
  Java,
  JavaScript,
  MongoDB,
  MySQL,
  Nextjs,
  ReactLib,
  ReactRouter,
  SocketIO,
  TailwindCSS,
  TypeScript,
} from "@aliimam/logos";
import { techById, techStack } from "@/lib/portfolio-data";
import { cn } from "@/lib/utils";

type LogoComponent = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number | string; className?: string }
>;

// Map of portfolio tech ids to @aliimam/logos components.
// Ids not in this map fall back to the next/image path using the local
// /icons/... assets defined in portfolio-data.ts.
const aliLogoById: Record<string, LogoComponent> = {
  typescript: TypeScript,
  javascript: JavaScript,
  java: Java,
  react: ReactLib,
  nextjs: Nextjs,
  tailwindcss: TailwindCSS,
  express: ExpressJs,
  hono: Hono,
  github: Github,
  mongodb: MongoDB,
  mysql: MySQL,
  figma: Figma,
  bun: Bun,
  cursor: Cursor,
  "react-router": ReactRouter,
  socket: SocketIO,
  android: Android,
};

export function TechIcon({ id, size = "lg" }: { id: string; size?: "sm" | "lg" }) {
  const tech = techById.get(id) ?? techStack[0];
  const isSmall = size === "sm";
  const iconSize = isSmall ? "size-5 sm:size-6" : "size-[22px] sm:size-9";
  const iconMotion = isSmall ? "duration-150 ease-out" : "duration-200";
  const AliLogo = aliLogoById[id];

  return (
    <span aria-label={tech.name} className="relative inline-flex group">
      {AliLogo ? (
        <AliLogo
          className={cn(
            "object-contain transition-transform hover:scale-110 cursor-pointer",
            iconSize,
            iconMotion,
          )}
          aria-hidden="true"
        />
      ) : (
        <Image
          src={tech.src}
          alt={tech.name}
          width={36}
          height={36}
          className={cn(
            "object-contain transition-transform hover:scale-110 cursor-pointer",
            iconSize,
            iconMotion,
            tech.invertOnDark && "invert-on-dark",
            tech.invertOnLight && "invert-on-light",
            tech.socketIcon && "socket-icon",
          )}
        />
      )}
      <span className="absolute bottom-full left-1/2 z-50 mb-4 -translate-x-1/2 translate-y-1 rounded-lg bg-[#111111] px-3 py-1.5 font-sans text-[12.5px] font-medium whitespace-nowrap text-[#f0f0f0] opacity-0 transition-[opacity,transform] duration-100 ease-out pointer-events-none group-hover:translate-y-0 group-hover:opacity-100 dark:bg-[#f0f0f0] dark:text-[#111111]">
        {tech.name}
      </span>
    </span>
  );
}

export function GitHubIcon({ className }: { className?: string }) {
  return (
    <Github
      className={cn("size-[18px]", className)}
      aria-hidden="true"
    />
  );
}
