// Static data and timing constants for the Lumen project showcase.
// Consumed by lumen-home-screen.tsx, lumen-results-screen.tsx, lumen-context.tsx,
// and the input-bar press-animation duration.
//
// Requirements: 4.4, 4.5, 3.7, 5.5, 5.7

export type ConceptStarter = {
  id: string;
  title: string;
  description: string;
};

/**
 * Numbered list rendered by `Concept_Starter_List` on `Lumen_Results_Screen`.
 *
 * Req 4.5: The first three entries MUST be `Velocity Veil`, `Skate-Tailored`,
 * and `Rain Room Glam` in that order, plus at least one additional starter
 * for visual density.
 */
export const conceptStarters: ReadonlyArray<ConceptStarter> = [
  {
    id: "velocity-veil",
    title: "Velocity Veil",
    description: "dancer wrapped in translucent fabric.",
  },
  {
    id: "skate-tailored",
    title: "Skate-Tailored",
    description: "sharp suit with motion blur.",
  },
  {
    id: "rain-room-glam",
    title: "Rain Room Glam",
    description: "frozen water droplets with strobes.",
  },
  {
    id: "neon-monsoon",
    title: "Neon Monsoon",
    description: "wet-street reflections under sodium signage.",
  },
] as const;

export type InspirationCard = {
  id: string;
  src: string;
  alt: string;
};

/**
 * Cards rendered by `Inspiration_Row` on `Lumen_Results_Screen`.
 *
 * Sourced from Unsplash. The `?q=80&w=600&auto=format&fit=crop` query
 * matches the reference template; `next.config.ts` whitelists
 * `images.unsplash.com` for `next/image`.
 */
export const inspirationCards: ReadonlyArray<InspirationCard> = [
  {
    id: "insp-01",
    src: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600&auto=format&fit=crop",
    alt: "Floral dress beachside editorial",
  },
  {
    id: "insp-02",
    src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop",
    alt: "Yellow tracksuit on pier",
  },
  {
    id: "insp-03",
    src: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=600&auto=format&fit=crop",
    alt: "Backlit portrait with sunglasses",
  },
] as const;

/**
 * mp4 sources for the `Hero_Orb` animation on `Lumen_Home_Screen`.
 * `HERO_ORB_PRIMARY` is the file referenced by `<source>`; the second is
 * kept available for future A/B selection but is not loaded by default.
 */
export const heroOrbVideoSources = [
  "/videos/lumen-orb-a.mp4",
  "/videos/lumen-orb-b.mp4",
] as const;

export const HERO_ORB_PRIMARY = heroOrbVideoSources[0];

/**
 * Timing constants (milliseconds) for the Lumen state machine and UI.
 *
 * - AUTO_ADVANCE_*: bounds for the one-shot home → results auto-advance timer
 *   scheduled by `LumenProvider` (Req 3.7).
 * - LOADING_*: bounds for the simulated loading delay between SUBMIT and
 *   LOAD_COMPLETE (Req 5.5).
 * - SEND_PRESS_MS: max duration of the send-button press animation (Req 5.7,
 *   which mandates ≤ 250ms).
 */
export const TIMING = {
  AUTO_ADVANCE_MIN_MS: 2000,
  AUTO_ADVANCE_MAX_MS: 3000,
  /**
   * Safety-net delay used by `LumenProvider` when the hero-orb video never
   * fires `onEnded` (autoplay blocked, decode error, reduced motion). Set
   * comfortably longer than the orb's natural duration (~5.2s) so it only
   * kicks in when something has actually gone wrong.
   */
  AUTO_ADVANCE_FALLBACK_MS: 7500,
  LOADING_MIN_MS: 400,
  LOADING_MAX_MS: 1500,
  SEND_PRESS_MS: 200,
} as const;
