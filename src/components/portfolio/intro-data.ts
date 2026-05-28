import type { ScrollTextGroup } from "@/components/ui/scroll-text-motion";

export const INTRO_GROUPS: ScrollTextGroup[] = [
  {
    items: [
      { text: "Welcome", pos: "pos-4", altPos: "pos-2" },
      { text: "I build for Android", pos: "pos-4", altPos: "pos-2" },
      { text: "End to end", pos: "pos-4", altPos: "pos-2" },
    ],
  },
  {
    items: [
      { text: "Kotlin", pos: "pos-1", altPos: "pos-3" },
      { text: "Jetpack Compose", pos: "pos-1", altPos: "pos-3" },
      { text: "Coroutines & Flow", pos: "pos-1", altPos: "pos-3" },
      { text: "Clean Architecture", pos: "pos-1", altPos: "pos-3" },
    ],
  },
  {
    items: [
      { text: "D", pos: "pos-1", altPos: "pos-2", xl: true, scrambleDuration: 2.5 },
    ],
  },
  {
    items: [
      { text: "compiling kotlin...", pos: "pos-1", altPos: "pos-3", scrambleDuration: 0 },
      { text: "█", pos: "pos-1", altPos: "pos-3", scrambleDuration: 0, typingIndicator: true },
    ],
  },
  {
    items: [
      { text: "Real-time chat", pos: "pos-2", altPos: "pos-5" },
      { text: "Firebase Realtime DB", pos: "pos-2", altPos: "pos-5" },
      { text: "Push notifications", pos: "pos-2", altPos: "pos-5" },
      { text: "Read receipts", pos: "pos-2", altPos: "pos-5" },
    ],
  },
  {
    items: [
      { text: "H", pos: "pos-3", altPos: "pos-9", xl: true, scrambleDuration: 2.5 },
    ],
  },
  {
    items: [
      { text: "Spring Boot", pos: "pos-3", altPos: "pos-2" },
      { text: "JWT Authentication", pos: "pos-3", altPos: "pos-2" },
      { text: "PostgreSQL", pos: "pos-3", altPos: "pos-2" },
      { text: "Service-layer RBAC", pos: "pos-3", altPos: "pos-2" },
    ],
  },
];

INTRO_GROUPS.push(
  {
    items: [
      { text: "running gradle build...", pos: "pos-1", altPos: "pos-3", scrambleDuration: 0 },
      { text: "█", pos: "pos-1", altPos: "pos-3", scrambleDuration: 0, typingIndicator: true },
    ],
  },
  {
    items: [
      { text: "MVVM", pos: "pos-2", altPos: "pos-4" },
      { text: "Hilt DI", pos: "pos-2", altPos: "pos-4" },
      { text: "Room persistence", pos: "pos-2", altPos: "pos-4" },
      { text: "Retrofit & OkHttp", pos: "pos-2", altPos: "pos-4" },
      { text: "WorkManager", pos: "pos-2", altPos: "pos-4" },
    ],
  },
  {
    items: [
      { text: "E", pos: "pos-1", altPos: "pos-3", xl: true, scrambleDuration: 2.5 },
    ],
  },
  {
    items: [
      { text: "500+ DSA solved", pos: "pos-2", altPos: "pos-9" },
      { text: "Dynamic programming", pos: "pos-2", altPos: "pos-9" },
      { text: "Graph algorithms", pos: "pos-2", altPos: "pos-9" },
      { text: "Top-percentile contests", pos: "pos-2", altPos: "pos-9" },
    ],
  },
  {
    items: [
      {
        text: "E",
        pos: "pos-3",
        altPos: "pos-10",
        xl: true,
        scrambleDuration: 2.5,
        flipEase: "expo.in",
      },
    ],
  },
  {
    items: [
      { text: "Final-year B.Tech CSE", pos: "pos-4", altPos: "pos-3" },
      { text: "Graphic Era Hill", pos: "pos-4", altPos: "pos-3" },
      { text: "Class of 2026", pos: "pos-4", altPos: "pos-3" },
    ],
  },
);

INTRO_GROUPS.push(
  {
    items: [
      { text: "deploying to vercel...", pos: "pos-1", altPos: "pos-3", scrambleDuration: 0 },
      { text: "█", pos: "pos-1", altPos: "pos-3", scrambleDuration: 0, typingIndicator: true },
    ],
  },
  {
    items: [
      { text: "R", pos: "pos-2", altPos: "pos-3", xl: true, scrambleDuration: 2.5 },
    ],
  },
  {
    items: [
      { text: "Polished UI", pos: "pos-3", altPos: "pos-6" },
      { text: "Accessible interactions", pos: "pos-3", altPos: "pos-6" },
      { text: "Offline-first sync", pos: "pos-3", altPos: "pos-6" },
      { text: "Lifecycle correctness", pos: "pos-3", altPos: "pos-6" },
    ],
  },
  {
    items: [
      { text: "From Room persistence", pos: "pos-2", altPos: "pos-7" },
      { text: "To live REST APIs", pos: "pos-2", altPos: "pos-7" },
      { text: "End to end ownership", pos: "pos-2", altPos: "pos-7" },
    ],
  },
  {
    items: [
      { text: "Built Chime", pos: "pos-3", altPos: "pos-8" },
      { text: "Built SplitRight", pos: "pos-3", altPos: "pos-8" },
      { text: "Built Lumen", pos: "pos-3", altPos: "pos-8" },
      { text: "Reviewed AI code", pos: "pos-3", altPos: "pos-8" },
      { text: "Outlier AI", pos: "pos-3", altPos: "pos-8" },
      { text: "7+ months", pos: "pos-3", altPos: "pos-8" },
      { text: "Lifecycle leaks", pos: "pos-3", altPos: "pos-8" },
      { text: "Coroutine scope", pos: "pos-3", altPos: "pos-8" },
      { text: "JPA queries", pos: "pos-3", altPos: "pos-8" },
      { text: "Soft sync", pos: "pos-3", altPos: "pos-8" },
      { text: "Stable shipping", pos: "pos-3", altPos: "pos-8" },
    ],
  },
  {
    items: [
      { text: "the wait is over", pos: "pos-1", altPos: "pos-1" },
      { text: "made by hand", pos: "pos-1", altPos: "pos-2" },
      { text: "with kotlin in mind", pos: "pos-1", altPos: "pos-4" },
    ],
  },
);
