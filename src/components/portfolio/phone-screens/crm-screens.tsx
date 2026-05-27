"use client";

import { motion } from "motion/react";

/**
 * iOS-style Lead CRM preview. The IPhoneFrame draws the status bar and
 * Dynamic Island; these screens render only the app content below.
 */

export function CrmDashboard() {
  return (
    <div
      className="flex h-full flex-col text-[#0a0a0b]"
      style={{ background: "var(--device-screen-bg, #f2f2f7)" }}
    >
      <div className="px-5 pb-3 pt-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-black/45">
          Hey, Dheeraj
        </p>
        <h2 className="mt-0.5 text-[26px] font-bold leading-tight tracking-[-0.02em]">
          Pipeline today
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-4">
        <Stat label="Open" value="48" delta="+6" tone="up" delay={0} />
        <Stat label="Won" value="12" delta="+2" tone="up" delay={0.05} />
        <Stat label="Pipeline" value="₹4.2L" delta="+18%" tone="up" delay={0.1} />
        <Stat label="At risk" value="3" delta="-1" tone="down" delay={0.15} />
      </div>

      <div className="mt-4 px-4">
        <h3 className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-black/45">
          Activity
        </h3>
        <ul className="overflow-hidden rounded-[12px] bg-white">
          {[
            { who: "Nidhi K.", what: "Moved to Won", time: "2m" },
            { who: "Ravi S.", what: "Replied", time: "11m" },
            { who: "Priya M.", what: "Scheduled call", time: "1h" },
          ].map((a, i) => (
            <motion.li
              key={a.who}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.18 + i * 0.08, ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
              className={`flex items-center gap-2.5 px-3 py-2.5 ${i > 0 ? "border-t border-black/5" : ""}`}
            >
              <span className="size-1.5 shrink-0 rounded-full bg-[#5856d6]" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold">{a.who}</span>
                <span className="block text-[11px] text-black/55">{a.what}</span>
              </span>
              <span className="text-[10px] tabular-nums text-black/40">{a.time}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CrmPipeline() {
  return (
    <div
      className="flex h-full flex-col text-[#0a0a0b]"
      style={{ background: "var(--device-screen-bg, #f2f2f7)" }}
    >
      <div className="px-5 pb-3 pt-1">
        <h2 className="text-[26px] font-bold leading-tight tracking-[-0.02em]">
          Sales Pipeline
        </h2>
      </div>

      <ul className="space-y-2 px-4">
        {[
          { stage: "New", count: 18, pct: 0.82, color: "#5856d6" },
          { stage: "Qualified", count: 12, pct: 0.55, color: "#af52de" },
          { stage: "Proposal", count: 9, pct: 0.4, color: "#ff2d55" },
          { stage: "Won", count: 12, pct: 0.55, color: "#34c759" },
          { stage: "Lost", count: 4, pct: 0.18, color: "#ff3b30" },
        ].map((s, i) => (
          <motion.li
            key={s.stage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
            className="rounded-[12px] bg-white px-3 py-2.5"
          >
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <span className="font-semibold">{s.stage}</span>
              <span className="font-semibold tabular-nums text-black/45">{s.count}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${s.pct * 100}%` }}
                transition={{ delay: 0.22 + i * 0.06, ease: [0.16, 1, 0.3, 1], duration: 0.75 }}
                style={{ background: s.color }}
                className="h-full rounded-full"
              />
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function CrmLead() {
  return (
    <div
      className="flex h-full flex-col text-[#0a0a0b]"
      style={{ background: "var(--device-screen-bg, #f2f2f7)" }}
    >
      <div className="px-5 pb-3 pt-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-black/45">
          Lead · #4291
        </p>
        <h2 className="mt-0.5 text-[26px] font-bold leading-tight tracking-[-0.02em]">
          Nidhi Kapoor
        </h2>
        <p className="mt-0.5 text-[12px] text-black/55">Acme Corp · ₹84,000</p>
      </div>

      <div className="px-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 320, damping: 22 }}
          className="rounded-[12px] bg-[#34c759]/10 p-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#0e7a3d]">
            Status
          </p>
          <p className="mt-1 text-[14px] font-semibold text-[#0e7a3d]">
            Won — 2 minutes ago
          </p>
        </motion.div>

        <ul className="mt-3 overflow-hidden rounded-[12px] bg-white">
          {[
            { k: "Source", v: "LinkedIn" },
            { k: "Owner", v: "Dheeraj" },
            { k: "Next step", v: "Send invoice" },
          ].map((row, i) => (
            <motion.li
              key={row.k}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-center justify-between px-3 py-2.5 text-[12px] ${
                i > 0 ? "border-t border-black/5" : ""
              }`}
            >
              <span className="text-black/55">{row.k}</span>
              <span className="font-semibold">{row.v}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  delta,
  tone,
  delay = 0,
}: {
  label: string;
  value: string;
  delta: string;
  tone: "up" | "down";
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
      className="rounded-[12px] bg-white p-3"
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-black/45">
        {label}
      </p>
      <p className="mt-0.5 text-[20px] font-bold tabular-nums leading-none tracking-[-0.02em]">
        {value}
      </p>
      <p
        className={`mt-1 text-[11px] font-semibold ${
          tone === "up" ? "text-[#34c759]" : "text-[#ff3b30]"
        }`}
      >
        {delta}
      </p>
    </motion.div>
  );
}
