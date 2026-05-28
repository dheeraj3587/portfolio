"use client";

// Bottom-pinned "Ask anything..." input shared by both Lumen screens.
// Owns no state of its own — reads `state.input` and dispatches via
// `useLumen()`. The empty-input guard lives in the reducer (Req 5.6),
// so the send button stays focusable regardless of input contents and
// Tab order is enforced purely by source order (Req 8.4).
//
// Requirements: 5.1, 5.2, 5.4, 5.7, 8.1, 8.2, 8.4

import { motion } from "motion/react";
import type { FormEvent } from "react";

import { useLumen } from "./lumen-context";
import { TIMING } from "./lumen-data";

/**
 * Inline send glyph — a small upward arrow inside the lavender orb.
 * Decorative; the button's accessible name is provided by `aria-label="Send"`.
 */
function SendGlyph() {
  return (
    <svg
      viewBox="0 0 14 14"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 11.5 V 3" />
      <path d="M3.5 6.5 L 7 3 L 10.5 6.5" />
    </svg>
  );
}

export function InputBar() {
  const { state, setInput, submit } = useLumen();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      // Glass pill: tall, translucent white with a soft inner highlight.
      // `:focus-within` highlights the entire pill when either child is
      // focused (Req 5.2).
      className="flex h-14 items-center gap-2 rounded-full border border-white/55 bg-white/55 pl-5 pr-1.5 shadow-[0_1px_1px_rgba(255,255,255,0.4)_inset,0_8px_24px_-12px_rgba(40,30,80,0.18)] backdrop-blur-xl focus-within:border-[rgba(125,75,255,0.45)] focus-within:ring-2 focus-within:ring-[rgba(125,75,255,0.25)]"
    >
      <input
        type="text"
        value={state.input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Ask anything..."
        aria-label="Ask anything"
        className="flex-1 bg-transparent text-[14px] text-[#2a2724] placeholder:text-black/45 focus:outline-none"
        autoComplete="off"
        spellCheck={false}
      />
      <motion.button
        type="submit"
        aria-label="Send"
        whileTap={{ scale: 0.9 }}
        transition={{ duration: TIMING.SEND_PRESS_MS / 1000 }}
        className="grid size-11 shrink-0 place-items-center rounded-full text-[#5d3fd3]"
        style={{
          background:
            "radial-gradient(circle at 32% 28%, #f0e3ff 0%, #d7c0ff 60%, #b89cff 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.7), 0 8px 22px -6px rgba(180,120,255,0.45)",
        }}
      >
        <SendGlyph />
      </motion.button>
    </form>
  );
}
