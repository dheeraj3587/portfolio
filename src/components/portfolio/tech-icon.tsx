import Image from "next/image";
import type { ComponentType, SVGProps } from "react";
import {
  Android,
  Figma,
  Java,
  TypeScript,
  Github,
} from "@aliimam/logos";
import { techById, techStack } from "@/lib/portfolio-data";
import { cn } from "@/lib/utils";

type LogoComponent = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number | string; className?: string }
>;

const aliLogoById: Record<string, LogoComponent> = {
  typescript: TypeScript,
  java: Java,
  github: Github,
  figma: Figma,
  android: Android,
};

export function TechIcon({
  id,
  size = "lg",
  showLabel = true,
}: {
  id: string;
  size?: "sm" | "lg";
  showLabel?: boolean;
}) {
  const tech = techById.get(id) ?? techStack[0];
  const isSmall = size === "sm";
  const iconSize = isSmall ? "size-7 sm:size-8" : "size-9 sm:size-11";
  const AliLogo = aliLogoById[id];

  return (
    <span aria-label={tech.name} className="relative inline-flex group">
      {AliLogo ? (
        <AliLogo
          className={cn(
            "object-contain transition-transform duration-200 ease-out hover:scale-110",
            iconSize,
          )}
          aria-hidden="true"
        />
      ) : (
        <Image
          src={tech.src}
          alt={tech.name}
          width={44}
          height={44}
          className={cn(
            "object-contain transition-transform duration-200 ease-out hover:scale-110",
            iconSize,
            tech.invertOnDark && "invert-on-dark",
            tech.invertOnLight && "invert-on-light",
          )}
        />
      )}
      {showLabel ? (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 font-sans text-xs font-medium text-background opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          {tech.name}
        </span>
      ) : null}
    </span>
  );
}
