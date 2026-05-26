"use client";

import * as React from "react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { FloatingEmoji } from "@/components/ui/floating-emoji";

export interface InterestItem {
  id: string;
  label: string;
  emoji: string;
}

interface Particle {
  id: string;
  emoji: string;
  xOffset: number;
  rotate: number;
}

interface EmojiSpreeChipsProps {
  interests: InterestItem[];
  onChange?: (selectedIds: string[]) => void;
}

export function EmojiSpreeChips({
  interests,
  onChange,
}: EmojiSpreeChipsProps) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [particles, setParticles] = React.useState<Particle[]>([]);
  const [isPanning, setIsPanning] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const clearParticlesRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearParticlesTimer = React.useCallback(() => {
    if (clearParticlesRef.current) {
      clearTimeout(clearParticlesRef.current);
      clearParticlesRef.current = null;
    }
  }, []);

  React.useEffect(() => clearParticlesTimer, [clearParticlesTimer]);

  const spawnParticles = React.useCallback((emoji: string) => {
    const newParticles: Particle[] = Array.from({ length: 3 }, () => ({
      id: crypto.randomUUID(),
      emoji,
      xOffset: (Math.random() - 0.5) * 180,
      rotate: (Math.random() - 0.5) * 40,
    }));

    setParticles(newParticles);

    clearParticlesTimer();

    clearParticlesRef.current = setTimeout(() => {
      setParticles([]);
    }, 1600);
  }, [clearParticlesTimer]);

  const toggleInterest = React.useCallback(
    (id: string, emoji: string) => {
      setSelected((prev) => {
        const exists = prev.includes(id);
        const updated = exists
          ? prev.filter((selectedId) => selectedId !== id)
          : [...prev, id];

        onChange?.(updated);

        if (!exists) {
          spawnParticles(emoji);
        }

        return updated;
      });
    },
    [onChange, spawnParticles],
  );

  const rows = React.useMemo(() => {
    const result: InterestItem[][] = [[], [], []];
    interests.forEach((item, index) => {
      result[index % 3].push(item);
    });
    return result;
  }, [interests]);

  return (
    <LazyMotion features={domAnimation}>
      <div className="relative isolate flex w-full max-w-4xl flex-col items-center overflow-hidden py-8 sm:py-10">
        <h2 className="mb-6 w-full self-start px-6 font-sans text-2xl font-bold sm:mb-8 sm:text-3xl">
          Interests
        </h2>

        <m.div
          ref={containerRef}
          className={`relative z-20 w-full cursor-grab overflow-hidden px-6 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] active:cursor-grabbing ${
            isPanning ? "touch-none" : "touch-pan-y"
          }`}
        >
          <m.div
            drag="x"
            dragConstraints={containerRef}
            onPanStart={() => setIsPanning(true)}
            onPanEnd={() => setIsPanning(false)}
            className="flex w-max flex-col gap-4 pr-12 sm:gap-5"
          >
            {rows.map((row) => (
              <div
                key={row.map((item) => item.id).join("-")}
                className="flex w-max gap-4 sm:gap-5"
              >
                {row.map((item) => {
                  const isSelected = selected.includes(item.id);

                  return (
                    <m.button
                      key={item.id}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 18,
                      }}
                      onClick={() => toggleInterest(item.id, item.emoji)}
                      className={`flex w-max items-center gap-2 rounded-full border px-4 py-1.5 font-sans text-base font-semibold whitespace-nowrap sm:gap-3 sm:px-5 sm:py-2 sm:text-lg ${
                        isSelected
                          ? "border-border bg-card dark:bg-card"
                          : "border-border bg-secondary dark:bg-muted"
                      }`}
                    >
                      <span>{item.emoji}</span>
                      <span>{item.label}</span>
                    </m.button>
                  );
                })}
              </div>
            ))}
          </m.div>
        </m.div>

        <div className="pointer-events-none absolute inset-0">
          <AnimatePresence>
            {particles.map((particle, index) => (
              <FloatingEmoji
                key={particle.id}
                emoji={particle.emoji}
                delay={index * 0.08}
                xOffset={particle.xOffset}
                rotate={particle.rotate}
              />
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-6 flex w-full justify-center">
          <AnimatePresence>
            {selected.length > 0 ? (
              <m.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                }}
                className="relative rounded-full border border-border bg-card px-6 py-2.5 font-sans text-lg font-bold shadow-lg sm:px-10 sm:py-4 sm:text-xl"
              >
                {selected.length} Interests
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </LazyMotion>
  );
}
