"use client";

import { motion } from "motion/react";

/**
 * iOS-style Chime preview. The IPhoneFrame draws the status bar and
 * Dynamic Island; these screens render only the app content below.
 */

const messages = [
  { from: "them", text: "Hey, you up?" },
  { from: "me", text: "yeah just shipping a build 🛠️" },
  { from: "them", text: "Compose feels nice rn ngl" },
  { from: "me", text: "lifecycle-aware, no leaks 🤝" },
];

export function ChimeInbox() {
  return (
    <div
      className="flex h-full flex-col text-[#0a0a0b]"
      style={{ background: "var(--device-screen-bg, #f2f2f7)" }}
    >
      <div className="flex items-center justify-between px-5 pb-1 pt-1">
        <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">
          Chats
        </h2>
        <span className="liquid-blue grid size-8 place-items-center rounded-full text-white">
          <PencilIcon />
        </span>
      </div>

      <div className="px-5 pb-2">
        <div className="liquid-glass flex h-8 items-center gap-2 rounded-[10px] px-2.5">
          <SearchIcon />
          <span className="text-[13px] text-black/45">Search</span>
        </div>
      </div>

      <ul className="mx-3 mt-1 overflow-hidden rounded-[12px] bg-white">
        {[
          { name: "Aanya", last: "see you at 7?", time: "11:42", unread: 2, accent: "#34c759" },
          { name: "Karthik", last: "pushed the PR ✅", time: "10:18", unread: 0, accent: "#5856d6" },
          { name: "Pooja", last: "thanks!!", time: "Yest", unread: 0, accent: "#ff9500" },
          { name: "Rohit", last: "let's call later", time: "Mon", unread: 1, accent: "#ff3b30" },
        ].map((c, i) => (
          <motion.li
            key={c.name}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.06 * i, ease: [0.16, 1, 0.3, 1], duration: 0.45 }}
            className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-black/5" : ""}`}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
              style={{ background: c.accent }}
            >
              {c.name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[14px] font-semibold">{c.name}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-black/40">{c.time}</span>
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-black/55">{c.last}</span>
            </span>
            {c.unread ? (
              <span className="grid size-[18px] place-items-center rounded-full bg-[#007aff] text-[10px] font-semibold text-white tabular-nums">
                {c.unread}
              </span>
            ) : null}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function ChimeChat() {
  return (
    <div
      className="flex h-full flex-col text-[#0a0a0b]"
      style={{ background: "var(--device-screen-bg, #ffffff)" }}
    >
      <header className="flex flex-col items-center gap-1 border-b border-black/5 pb-2 pt-1">
        <span className="grid size-9 place-items-center rounded-full bg-[#34c759] text-[13px] font-semibold text-white">
          A
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold">
          Aanya
          <ChevronRightSmall />
        </span>
      </header>

      <ul className="flex-1 space-y-1 overflow-hidden px-3 py-3">
        {messages.map((m, i) => {
          const mine = m.from === "me";
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.18 * i, ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
              className={mine ? "flex justify-end" : "flex justify-start"}
            >
              <span
                className={`max-w-[78%] px-3 py-1.5 text-[13px] leading-[1.35] ${
                  mine
                    ? "rounded-[18px] bg-[#007aff] text-white"
                    : "rounded-[18px] bg-[#e9e9eb] text-black"
                }`}
              >
                {m.text}
              </span>
            </motion.li>
          );
        })}

        <motion.li
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="flex justify-start"
        >
          <span className="flex items-center gap-1 rounded-[18px] bg-[#e9e9eb] px-3 py-2">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-1.5 rounded-full bg-black/40"
                animate={{ y: [0, -3, 0], opacity: [0.4, 0.85, 0.4] }}
                transition={{ delay: i * 0.18, duration: 1, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </span>
        </motion.li>
      </ul>

      <div className="border-t border-black/5 px-3 pb-5 pt-2">
        <div className="liquid-glass flex items-center gap-2 rounded-full px-2 py-1">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-black/[0.08] text-[14px] font-semibold text-black/55">
            +
          </span>
          <span className="flex flex-1 items-center px-2 py-1 text-[12px] text-black/45">
            iMessage
          </span>
          <span className="liquid-blue grid size-7 shrink-0 place-items-center rounded-full text-white">
            <SendIcon />
          </span>
        </div>
      </div>
    </div>
  );
}

export function ChimeCompose() {
  return (
    <div
      className="flex h-full flex-col text-[#0a0a0b]"
      style={{ background: "var(--device-screen-bg, #ffffff)" }}
    >
      <header className="flex flex-col items-center gap-1 border-b border-black/5 pb-2 pt-1">
        <span className="grid size-9 place-items-center rounded-full bg-[#34c759] text-[13px] font-semibold text-white">
          A
        </span>
        <span className="text-[11px] font-semibold">Aanya</span>
      </header>

      <div className="flex-1" />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, ease: [0.16, 1, 0.3, 1], duration: 0.45 }}
        className="border-t border-black/5 px-3 pb-5 pt-2"
      >
        <div className="liquid-glass flex items-center gap-2 rounded-full px-2 py-1">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-black/[0.08] text-[14px] font-semibold text-black/55">
            +
          </span>
          <div className="flex flex-1 items-center gap-2 px-2">
            <span className="size-1.5 animate-pulse rounded-full bg-[#007aff]" />
            <span className="flex-1 text-[12px] text-[#0a0a0b]">
              shipping it now ✨
            </span>
          </div>
          <motion.span
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.55, type: "spring", stiffness: 380, damping: 14 }}
            className="liquid-blue grid size-7 shrink-0 place-items-center rounded-full text-white"
          >
            <SendIcon />
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Icons ── */
function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-black/40">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.4 20.4 20.85 12.92a1 1 0 0 0 0-1.84L3.4 3.6a1 1 0 0 0-1.39 1.21l2.36 6.37a1 1 0 0 0 .8.65l8.5 1.17a.5.5 0 0 1 0 1l-8.5 1.17a1 1 0 0 0-.8.65l-2.36 6.37a1 1 0 0 0 1.39 1.21Z" />
    </svg>
  );
}
function ChevronRightSmall() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/30">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
