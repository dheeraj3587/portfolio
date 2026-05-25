"use client";

import * as React from "react";
import { m } from "motion/react";

type FloatingEmojiProps = {
  emoji: string;
  delay: number;
  xOffset: number;
  rotate: number;
};

export function FloatingEmoji({
  emoji,
  delay,
  xOffset,
  rotate,
}: FloatingEmojiProps) {
  const [phase, setPhase] = React.useState<"up" | "down">("up");
  const isMobile = React.useSyncExternalStore(
    (callback) => {
      window.addEventListener("resize", callback);
      return () => window.removeEventListener("resize", callback);
    },
    () => window.innerWidth < 640,
    () => false,
  );

  return (
    <m.div
      initial={{ y: 0, x: 0, opacity: 0, scale: 0.6, rotate: 0 }}
      animate={{
        y: [0, isMobile ? -180 : -260, isMobile ? -180 : -260, 30],
        x: [
          0,
          xOffset * (isMobile ? 0.6 : 1),
          xOffset * (isMobile ? 0.5 : 0.8),
        ],
        opacity: [0, 1, 1, 0],
        scale: [0.6, isMobile ? 2 : 3, isMobile ? 2 : 3, 0.6],
        rotate: [0, rotate, rotate * 0.5],
      }}
      transition={{
        duration: 1,
        ease: "easeInOut",
        delay,
      }}
      onUpdate={(latest) => {
        if (typeof latest.y !== "number") return;
        const threshold = isMobile ? -90 : -130;
        setPhase(latest.y < threshold ? "up" : "down");
      }}
      className={`absolute bottom-20 left-1/2 -translate-x-1/2 text-4xl select-none sm:text-6xl ${
        phase === "up" ? "z-30" : "z-10"
      }`}
    >
      {emoji}
    </m.div>
  );
}
