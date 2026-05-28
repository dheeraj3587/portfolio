"use client";

// `Lumen_Results_Screen` — second of the two Lumen phone screens.
//
// Layout (top → bottom):
//   - Full-width prompt pill
//   - Three equal-width inspiration cards
//   - Bold sans-serif heading "Quick concept starters for your next shoot"
//   - Numbered list with bold title + descriptive sentence per item
//   - bottom-pinned <InputBar />
//
// The middle region scrolls if content overflows; the input bar stays
// pinned. The screen renders no device chrome — that is IPhoneFrame's job.

import Image from "next/image";

import { InputBar } from "./input-bar";
import { useLumen } from "./lumen-context";
import { conceptStarters, inspirationCards } from "./lumen-data";
import { DEFAULT_PROMPT } from "./lumen-machine";

/**
 * Full-width glass pill at the top of the results screen showing the
 * submitted prompt.
 */
function PromptPill({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-white/55 bg-white/55 px-4 py-3 text-[14px] font-medium leading-[1.35] text-[#2a2724] shadow-[0_1px_1px_rgba(255,255,255,0.4)_inset,0_6px_18px_-10px_rgba(40,30,80,0.18)] backdrop-blur-xl">
      {text}
    </div>
  );
}

/**
 * Three equal-width inspiration cards in a flex row.
 */
function InspirationRow() {
  const cards = inspirationCards.slice(0, 3);
  return (
    <ul className="flex gap-2.5">
      {cards.map((card) => (
        <li
          key={card.id}
          className="relative flex-1 overflow-hidden rounded-[20px]"
          style={{ aspectRatio: "1 / 1.05" }}
        >
          <Image
            src={card.src}
            alt={card.alt}
            fill
            sizes="(max-width: 480px) 30vw, 120px"
            className="object-cover"
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Numbered list of concept starters with bold title + descriptive sentence.
 */
function ConceptStarterList() {
  return (
    <ol className="space-y-3.5 pl-5">
      {conceptStarters.slice(0, 3).map((starter) => (
        <li
          key={starter.id}
          className="list-decimal text-[13.5px] leading-[1.5] text-[#2a2724] marker:font-normal marker:text-black/55"
        >
          <span className="font-semibold">{starter.title}</span>
          <span className="text-black/70"> — {starter.description}</span>
        </li>
      ))}
    </ol>
  );
}

export function LumenResultsScreen() {
  const { state } = useLumen();
  const promptText = state.submittedPrompt ?? DEFAULT_PROMPT;

  return (
    <div
      className="flex h-full flex-col text-[#2a2724]"
      style={{ background: "var(--device-screen-bg, #f8f6f2)" }}
    >
      {/* Middle scroll region */}
      <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4 pt-5">
        <PromptPill text={promptText} />
        <InspirationRow />

        <h2 className="text-[20px] font-bold leading-[1.25] tracking-[-0.01em] text-[#1f1f1f]">
          Quick concept starters for your next shoot
        </h2>

        <ConceptStarterList />
      </div>

      {/* Bottom-pinned input bar */}
      <div className="px-4 pb-5 pt-2">
        <InputBar />
      </div>
    </div>
  );
}
