"use client";

// Chime — three dark, warm-toned screens that mirror the reference design:
//   • ChimeInbox    → Chats list with stories rail, filter chips, threads
//   • ChimeChat     → Group chat "Visit Denpasar" with photo grid attachment
//   • ChimeCompose  → Khadija profile detail with stats + settings list
//
// All three use the warm-brown gradient background (`#3a261d → #1a0f0b`)
// shown in the reference. Colours, copy, and the bottom tab bar match the
// pasted design 1:1. Status bar / Dynamic Island / home indicator are
// drawn by `IPhoneFrame`, not here (Req 6.3).
//
// Backwards-compat exports: `ChimeInbox`, `ChimeChat`, `ChimeCompose`
// match the names referenced by `phone-screens/index.tsx` and the
// `screens.test.tsx` background invariant.

import Image from "next/image";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Camera,
  ChevronRight,
  Image as ImageLucide,
  Lock,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Video,
} from "lucide-react";

const WARM_BG =
  "radial-gradient(120% 70% at 50% 0%, #5a3a2c 0%, #3a261d 35%, #1a100b 70%, #0d0805 100%)";

// When a screen renders outside `IPhoneFrame` (e.g. in `screens.test.tsx`),
// the `--device-screen-bg` custom property is unset, so we use the warm
// gradient as the fallback to keep the standalone preview looking correct.
// When mounted inside the frame, the frame paints the gradient on the
// screen container itself — including under the status bar — so the screen
// root MUST be transparent. Painting the gradient again here would create
// a horizontal seam at the status-bar boundary because the children's
// gradient is rendered relative to the padded children area, while the
// frame's gradient is rendered relative to the full screen.
const ROOT_BG_VAR = `var(--device-screen-bg, ${WARM_BG})`;

/* ────────────────────────────────────────────────────────────────────── */
/*                          C H A T S   L I S T                            */
/* ────────────────────────────────────────────────────────────────────── */

const STORIES = [
  { name: "You", img: null, badge: null },
  {
    name: "Kaja",
    img: "https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?q=80&w=240&auto=format&fit=crop",
    badge: 3,
  },
  {
    name: "Imran",
    img: "https://images.unsplash.com/photo-1502209524164-acea936639a2?q=80&w=240&auto=format&fit=crop",
    badge: 1,
  },
  {
    name: "Stella",
    img: "https://images.unsplash.com/photo-1493606278519-11aa9f86e40a?q=80&w=240&auto=format&fit=crop",
    badge: 1,
  },
  {
    name: "Shee",
    img: "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=240&auto=format&fit=crop",
    badge: null,
  },
  {
    name: "Jo",
    img: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=240&auto=format&fit=crop",
    badge: null,
  },
];

const FILTERS = ["All", "Favorites", "Work", "Groups", "Communities"];

const THREADS = [
  {
    name: "Visit Denpasar",
    last: "Khai : Are they still open at sunday?",
    time: "24 mins",
    unread: 4,
    pinned: true,
    avatar:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=240&auto=format&fit=crop",
  },
  {
    name: "Kira Lindegaard",
    last: "Got it, thanks Kira!",
    time: "2 mins",
    unread: 0,
    pinned: false,
    dot: true,
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=240&auto=format&fit=crop",
  },
  {
    name: "Kaja Kumar",
    last: "Thanks bro, see you later",
    time: "2 mins",
    unread: 0,
    pinned: false,
    dot: true,
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=240&auto=format&fit=crop",
  },
  {
    name: "Ayana Izquierdo",
    last: "Sure hahaha",
    time: "5 mins",
    unread: 0,
    pinned: false,
    avatar:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=240&auto=format&fit=crop",
  },
  {
    name: "Khadija Dubois",
    last: "No, I think we can start at 8pm, wdyt?",
    time: "12 mins",
    unread: 2,
    pinned: false,
    avatar:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=240&auto=format&fit=crop",
  },
  {
    name: "Cansaas",
    last: "You : Looking good guys!!, btw anyone have differe...",
    time: "18 mins",
    unread: 0,
    pinned: false,
    group: true,
  },
  {
    name: "Zoya Ziegler",
    last: "—",
    time: "20 mins",
    unread: 0,
    pinned: false,
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=240&auto=format&fit=crop",
  },
];

export function ChimeInbox() {
  return (
    <div
      className="flex h-full flex-col text-white"
      style={{ background: ROOT_BG_VAR }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-2 pb-3">
        <h2 className="text-[26px] font-semibold tracking-[-0.01em]">
          Chats
        </h2>
        <div className="flex items-center gap-2">
          <RoundIconButton>
            <Search className="size-4" strokeWidth={1.6} />
          </RoundIconButton>
          <RoundIconButton>
            <Camera className="size-4" strokeWidth={1.6} />
          </RoundIconButton>
          <RoundIconButton>
            <MoreVertical className="size-4" strokeWidth={1.6} />
          </RoundIconButton>
        </div>
      </div>

      {/* Stories rail */}
      <div className="overflow-x-auto pb-2">
        <ul className="flex w-max items-end gap-2.5 px-5">
          {STORIES.map((s, i) => (
            <li key={i} className="flex flex-col items-center gap-1.5">
              <div className="relative size-[58px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
                {s.img ? (
                  <Image
                    src={s.img}
                    alt={s.name}
                    fill
                    sizes="58px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Plus className="size-5 text-white/70" strokeWidth={1.6} />
                  </div>
                )}
                {s.badge ? (
                  <span className="absolute right-1 top-1 grid size-[18px] place-items-center rounded-full bg-white/15 text-[9px] font-semibold backdrop-blur">
                    {s.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] text-white/70">{s.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Filter chips */}
      <div className="overflow-x-auto pb-2">
        <ul className="flex w-max items-center gap-2 px-5">
          {FILTERS.map((f, i) => (
            <li
              key={f}
              className={`rounded-full border px-3 py-1 text-[11px] ${
                i === 0
                  ? "border-white/15 bg-white/10 text-white"
                  : "border-white/10 bg-white/[0.04] text-white/60"
              }`}
            >
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Threads */}
      <ul className="flex-1 overflow-y-auto px-3 pb-2">
        {THREADS.map((t, i) => (
          <motion.li
            key={t.name}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.04 * i,
              ease: [0.16, 1, 0.3, 1],
              duration: 0.4,
            }}
            className="flex items-center gap-3 px-2 py-2"
          >
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
              {t.avatar ? (
                <Image
                  src={t.avatar}
                  alt={t.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-emerald-700/40 text-[14px] font-semibold">
                  #
                </div>
              )}
              {t.dot ? (
                <span className="absolute right-0 top-0 size-2.5 rounded-full border-2 border-[#1a100b] bg-amber-400" />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">
                {t.name}
              </p>
              <p className="truncate text-[11px] text-white/55">{t.last}</p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[10px] text-white/50">{t.time}</span>
              <div className="flex items-center gap-1">
                {t.pinned ? (
                  <span className="text-[10px] text-amber-400">📌</span>
                ) : null}
                {t.unread ? (
                  <span className="grid min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white tabular-nums">
                    {t.unread}
                  </span>
                ) : null}
              </div>
            </div>
          </motion.li>
        ))}
      </ul>

      {/* Bottom tab bar */}
      <ChimeTabBar active="chats" />
    </div>
  );
}

function RoundIconButton({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/85 backdrop-blur">
      {children}
    </span>
  );
}

function ChimeTabBar({
  active,
}: {
  active: "chats" | "call" | "updates" | "profile";
}) {
  const items = [
    { id: "chats" as const, label: "Chats", Icon: ChatTabIcon },
    { id: "call" as const, label: "Call", Icon: Phone },
    { id: "updates" as const, label: "Updates", Icon: Bell },
    { id: "profile" as const, label: "Profile", Icon: ProfileTabIcon },
  ];

  return (
    <div className="px-3 pb-3 pt-1">
      <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2 py-1.5 backdrop-blur-xl">
        {items.map((it) => {
          const isActive = active === it.id;
          return (
            <span
              key={it.id}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 ${
                isActive ? "bg-white/10" : ""
              }`}
            >
              <it.Icon
                className={`size-4 ${
                  isActive ? "text-amber-400" : "text-white/70"
                }`}
                strokeWidth={1.6}
              />
              <span
                className={`text-[9px] ${
                  isActive ? "text-white" : "text-white/55"
                }`}
              >
                {it.label}
              </span>
            </span>
          );
        })}
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-white">
          <Plus className="size-4" strokeWidth={1.8} />
        </span>
      </div>
    </div>
  );
}

function ChatTabIcon({
  className,
  strokeWidth,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function ProfileTabIcon({
  className,
  strokeWidth,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*                            C H A T   D E T A I L                        */
/* ────────────────────────────────────────────────────────────────────── */

const VAN_PHOTOS = [
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=400&auto=format&fit=crop",
];

export function ChimeChat() {
  return (
    <div
      className="flex h-full flex-col text-white"
      style={{ background: ROOT_BG_VAR }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-3 py-2">
        <ArrowLeft className="size-4 text-white/70" strokeWidth={1.8} />
        <div className="size-7 shrink-0 overflow-hidden rounded-full bg-white/10">
          <Image
            src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=160&auto=format&fit=crop"
            alt="Visit Denpasar"
            width={28}
            height={28}
            className="size-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold">
            Visit Denpasar
          </p>
          <p className="truncate text-[9.5px] text-white/45">
            Akbar, Fawzy, Khai, Kira, Masa, Sin...
          </p>
        </div>
        <Video className="size-4 text-white/70" strokeWidth={1.8} />
        <Phone className="size-4 text-white/70" strokeWidth={1.8} />
        <MoreVertical className="size-4 text-white/70" strokeWidth={1.8} />
      </div>

      {/* Conversation */}
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-[12px]">
        {/* Outgoing */}
        <Bubble side="right">Do we need to prepare a van?</Bubble>
        <TimeStamp value="8:16PM" />

        {/* Incoming with sender */}
        <NamedBubble name="Kira Lindegaard">
          Oh, I think that&apos;s a good idea
        </NamedBubble>
        <Avatared>
          <Bubble side="left">Now how we get that? 🤔</Bubble>
        </Avatared>
        <TimeStamp value="8:19PM" />

        <NamedBubble name="Akbar Lazuardi">
          We can use my dad van
        </NamedBubble>

        {/* Photo grid attachment */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative ml-1 mt-1 grid w-fit grid-cols-3 gap-1.5"
        >
          {VAN_PHOTOS.map((src, i) => (
            <div
              key={i}
              className="relative size-20 overflow-hidden rounded-xl"
            >
              <Image
                src={src}
                alt="Van"
                fill
                sizes="80px"
                className="object-cover"
              />
              {i === 2 ? (
                <span className="absolute inset-0 grid place-items-center bg-black/45 text-[10px] font-medium">
                  +2 photos
                </span>
              ) : null}
            </div>
          ))}
          <div className="absolute -bottom-2 left-12 flex items-center gap-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] backdrop-blur">
            🔥 3 ❤️ 2
          </div>
        </motion.div>

        <TimeStamp value="8:21PM" />

        <Avatared>
          <NamedBubble name="Khai Azzahra" inline>
            Oh that&apos;s nice Akbar
          </NamedBubble>
        </Avatared>

        <Avatared>
          <Bubble side="left">
            <span className="text-amber-300">@Rohmad</span> would be the
            driver 😏
          </Bubble>
        </Avatared>

        <TimeStamp value="8:22PM" align="right" />
      </div>

      {/* Input */}
      <ChimeChatInput />
    </div>
  );
}

function Bubble({
  side,
  children,
}: {
  side: "left" | "right";
  children: React.ReactNode;
}) {
  const base =
    "inline-block max-w-[78%] rounded-2xl px-3 py-1.5 leading-[1.35] text-[12px]";
  if (side === "right") {
    return (
      <div className="flex justify-end">
        <span className={`${base} bg-black/55 text-white`}>{children}</span>
      </div>
    );
  }
  return (
    <span className={`${base} bg-white/[0.06] text-white/90`}>{children}</span>
  );
}

function NamedBubble({
  name,
  inline,
  children,
}: {
  name: string;
  inline?: boolean;
  children: React.ReactNode;
}) {
  const content = (
    <span className="inline-block max-w-[78%] rounded-2xl bg-white/[0.06] px-3 py-1.5 text-[12px] leading-[1.35] text-white/90">
      <span className="block text-[10.5px] font-semibold text-amber-200/80">
        {name}
      </span>
      {children}
    </span>
  );
  if (inline) return content;
  return <div className="flex">{content}</div>;
}

function Avatared({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-1.5">
      <div className="size-5 shrink-0 overflow-hidden rounded-full bg-white/10">
        <Image
          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=80&auto=format&fit=crop"
          alt=""
          width={20}
          height={20}
          className="size-full object-cover"
        />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TimeStamp({
  value,
  align = "left",
}: {
  value: string;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`text-[10px] text-white/40 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {value}
    </div>
  );
}

function ChimeChatInput() {
  return (
    <div className="px-3 pb-4 pt-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">
          <ChatTabIcon className="size-3.5 text-white/45" strokeWidth={1.6} />
          <span className="flex-1 text-[12px] text-white/45">Type here</span>
          <Camera className="size-4 text-white/55" strokeWidth={1.6} />
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white">
          <Plus className="size-4" strokeWidth={1.8} />
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*                            P R O F I L E                                */
/* ────────────────────────────────────────────────────────────────────── */

const MEDIA_PHOTOS = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=240&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1481349518771-20055b2a7b24?q=80&w=240&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1473625247510-8ceb1760943f?q=80&w=240&auto=format&fit=crop",
];

export function ChimeCompose() {
  return (
    <div
      className="flex h-full flex-col overflow-y-auto text-white"
      style={{ background: ROOT_BG_VAR }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2">
        <RoundIconButton>
          <ArrowLeft className="size-4" strokeWidth={1.8} />
        </RoundIconButton>
        <RoundIconButton>
          <MoreVertical className="size-4" strokeWidth={1.6} />
        </RoundIconButton>
      </div>

      {/* Avatar block */}
      <div className="flex flex-col items-center px-5 pb-5 pt-1">
        <div className="relative size-[88px] overflow-hidden rounded-full border border-white/10">
          <Image
            src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=240&auto=format&fit=crop"
            alt="Khadija Dubois"
            fill
            sizes="88px"
            className="object-cover"
          />
          <span className="absolute right-1 bottom-1 size-3 rounded-full border-2 border-[#1a100b] bg-amber-400" />
        </div>
        <p className="mt-2.5 text-[15px] font-semibold">Khadija Dubois</p>
        <p className="text-[11px] text-white/55">+12-6541-1234</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4">
        <StatTile label="Message" value="12,145" />
        <StatTile label="Group" value="94" />
        <StatTile label="Spaces" value="48" />
      </div>

      {/* Media and photos */}
      <div className="mt-3 px-4">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold">Media and photos</p>
            <ChevronRight className="size-3.5 text-white/45" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MEDIA_PHOTOS.map((src, i) => (
              <div
                key={i}
                className="relative aspect-[4/3] overflow-hidden rounded-lg"
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
                {i === 2 ? (
                  <span className="absolute inset-0 grid place-items-center bg-black/45 text-[11px] font-semibold">
                    +42
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings list */}
      <div className="mt-3 px-4">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
          <SettingsRow Icon={Bell} label="Notification" />
          <SettingsRow Icon={ImageLucide} label="Media visibility" />
          <SettingsRow Icon={Bookmark} label="Bookmarked" />
          <SettingsRow Icon={Lock} label="Lock Chat" toggle />
        </div>
      </div>

      {/* Second list */}
      <div className="mt-3 px-4 pb-6">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
          <SettingsRow Icon={Bell} label="Notification" />
          <SettingsRow Icon={ImageLucide} label="Media visibility" />
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2">
      <p className="text-[10px] text-white/55">{label}</p>
      <p className="mt-0.5 text-[14px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SettingsRow({
  Icon,
  label,
  toggle,
}: {
  Icon: typeof Bell;
  label: string;
  toggle?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-3 py-2.5 last:border-b-0">
      <Icon className="size-4 text-white/70" strokeWidth={1.6} />
      <p className="flex-1 text-[12px] text-white/85">{label}</p>
      {toggle ? (
        <span className="relative h-5 w-9 rounded-full bg-white/10">
          <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white/70" />
        </span>
      ) : (
        <ChevronRight className="size-3.5 text-white/45" />
      )}
    </div>
  );
}
