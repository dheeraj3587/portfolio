"use client";

import { useRef } from "react";
import {
  useScrollTextMotion,
  type ScrollTextGroup,
} from "@/hooks/use-scroll-text-motion";

interface ScrollTextMotionProps {
  groups: ScrollTextGroup[];
  logo?: string;
  className?: string;
}

export type {
  ScrollTextEl,
  ScrollTextGroup,
} from "@/hooks/use-scroll-text-motion";

export function ScrollTextMotion({
  groups,
  logo,
  className = "",
}: ScrollTextMotionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLSpanElement>(null);

  useScrollTextMotion(contentRef, logoRef, groups, logo);

  return (
    <div
      className={`scroll-text-motion min-h-screen bg-black text-white ${className}`}
    >
      {logo && (
        <div className="scroll-text-fixed pointer-events-none fixed inset-0 z-0 grid place-items-center">
          <div className="scroll-text-logo text-[clamp(2rem,10vw,4rem)] font-normal">
            <span ref={logoRef}>{logo}</span>
          </div>
        </div>
      )}
      <div
        className="scroll-text-content relative z-10 px-6 pb-[25vh] pt-[100vh]"
        ref={contentRef}
      >
        {groups.map((group, gi) => (
          <div key={gi} className="scroll-text-group mb-[10vh] flex flex-col">
            {group.items.map((item, ii) => (
              <div
                key={ii}
                className={`scroll-text-el el whitespace-nowrap uppercase ${item.pos} ${
                  item.xl ? "el--xl" : ""
                } ${item.typingIndicator ? "typing-indicator" : ""}`}
                data-alt-pos={item.altPos}
                data-flip-ease={item.flipEase ?? "expo.inOut"}
                data-scramble-duration={String(item.scrambleDuration ?? 1)}
              >
                <span className="scroll-text-inner">{item.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
