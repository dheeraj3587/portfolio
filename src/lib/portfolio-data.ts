export type TechItem = {
  id: string;
  name: string;
  src: string;
  invertOnDark?: boolean;
  invertOnLight?: boolean;
  socketIcon?: boolean;
};

export const profile = {
  name: "Dheeraj",
  initials: "DJ",
  location: "India",
  email: "dheerajjoshi@dheerajjoshi.dev",
  pronouns: "he/him",
  githubUsername: "dheeraj3587",
  roles: [
    "Android Developer",
    "Kotlin Developer",
    "Java Developer",
    "Mobile Engineer",
    "Product Engineer",
    "Detail Oriented",
  ],
};

export const navItems = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Components", href: "#components" },
];

export const socialLinks = {
  x: "https://x.com/dheeraj3587",
  github: "https://github.com/dheeraj3587",
  website: "https://dheerajjoshi.dev",
  email: `mailto:${profile.email}`,
};

export const techStack: TechItem[] = [
  // Languages
  { id: "kotlin", name: "Kotlin", src: "/icons/tech/kotlin.svg" },
  { id: "java", name: "Java", src: "/icons/tech/java.svg" },
  { id: "typescript", name: "TypeScript", src: "/icons/tech/typescript.svg" },

  // Android Core
  {
    id: "jetpack-compose",
    name: "Jetpack Compose",
    src: "/icons/tech/jetpack-compose.svg",
  },
  { id: "mvvm", name: "MVVM", src: "/icons/tech/mvvm.svg" },
  { id: "hilt", name: "Hilt", src: "/icons/tech/hilt.svg" },
  { id: "coroutines", name: "Coroutines", src: "/icons/tech/coroutines.svg" },
  { id: "room", name: "Room", src: "/icons/tech/room.svg" },
  { id: "sqlite", name: "SQLite", src: "/icons/tech/sqlite.svg" },

  // Backend & Networking
  { id: "firebase", name: "Firebase", src: "/icons/tech/firebase.svg" },
  { id: "rest-api", name: "REST APIs", src: "/icons/tech/rest-api.svg" },
  { id: "graphql", name: "GraphQL", src: "/icons/tech/graphql.svg" },
  { id: "retrofit", name: "Retrofit", src: "/icons/tech/retrofit.svg" },
  { id: "ktor", name: "Ktor", src: "/icons/tech/ktor.svg" },
  { id: "postgresql", name: "PostgreSQL", src: "/icons/tech/postgresql.svg" },

  // Tools & DevOps
  {
    id: "android-studio",
    name: "Android Studio",
    src: "/icons/tech/android-studio.svg",
  },
  { id: "git", name: "Git", src: "/icons/tech/git.svg" },
  {
    id: "github",
    name: "GitHub",
    src: "/icons/social/github.png",
    invertOnDark: true,
  },
  { id: "gradle", name: "Gradle", src: "/icons/tech/gradle.svg" },
  { id: "postman", name: "Postman", src: "/icons/tools/postman.webp" },
  { id: "cursor-ai", name: "Cursor AI", src: "/icons/tools/cursor-ai.png" },
  { id: "cicd", name: "CI/CD", src: "/icons/tech/cicd.svg" },

  // Advanced
  {
    id: "compose-multiplatform",
    name: "Compose Multiplatform",
    src: "/icons/tech/compose-multiplatform.svg",
  },
  { id: "websockets", name: "WebSockets", src: "/icons/tech/websockets.svg" },
  { id: "media3", name: "Media3", src: "/icons/tech/media3.svg" },
];

const projectOnlyTech: TechItem[] = [
  { id: "android", name: "Android", src: "/icons/tech/android.svg" },
  { id: "figma", name: "Figma", src: "/icons/tech/figma.svg" },
];

export const techById = new Map(
  [...techStack, ...projectOnlyTech].map((tech) => [tech.id, tech]),
);


export const projects = [
  {
    title: "Pulse Habit Tracker",
    description:
      "An offline-first Android habit tracker with gentle reminders and clean daily insights.",
    image: "/images/projects/preview_1.webp",
    links: {
      site: socialLinks.website,
    },
    stack: ["android", "kotlin", "jetpack-compose", "firebase", "gradle"],
  },
  {
    title: "City Commute Companion",
    description:
      "A real-time Android companion for routes, alerts, and saved trips with smooth UX.",
    image: "/images/projects/preview_2.webp",
    links: {
      github: socialLinks.github,
      site: socialLinks.website,
    },
    stack: ["android", "kotlin", "java", "firebase", "android-studio"],
  },
];

export const experience = [
  {
    role: "Android Engineer",
    company: "Independent",
    location: "Remote, Full-time",
    date: "2026 - Present",
    body: "Building polished Android apps with Kotlin, Jetpack Compose, and clean architecture.",
    bullets: [
      "Designing Compose UI with accessible interaction states and responsive layouts",
      "Shipping features end-to-end with offline support and reliable sync",
    ],
    stack: [
      "android",
      "kotlin",
      "jetpack-compose",
      "gradle",
      "firebase",
      "figma",
    ],
    active: true,
  },
  {
    role: "Android Developer",
    company: "Selected Work",
    location: "Freelance",
    date: "2024 - 2026",
    body: "Delivered Android apps for clients with an emphasis on performance, clarity, and maintainability.",
    bullets: [
      "Integrated REST APIs, authentication, and notifications for mobile workflows",
      "Improved startup time and stability through profiling and refactors",
    ],
    stack: ["android", "kotlin", "java", "firebase", "git", "postman"],
    active: false,
  },
];

export const footerLinks = [
  { label: "About", href: "#about" },
  { label: "Services", href: "#home" },
  { label: "Components", href: "#components" },
];

export const interests = [
  { id: "1", label: "Design", emoji: "🎨" },
  { id: "2", label: "Music", emoji: "🎵" },
  { id: "3", label: "Gaming", emoji: "🎮" },
  { id: "4", label: "Cooking", emoji: "🍳" },
  { id: "5", label: "Travel", emoji: "✈️" },
  { id: "6", label: "Crypto", emoji: "🪙" },
  { id: "7", label: "Photography", emoji: "📸" },
  { id: "8", label: "Coding", emoji: "💻" },
  { id: "9", label: "Fitness", emoji: "🏋️" },
  { id: "10", label: "Art", emoji: "🖼️" },
  { id: "11", label: "Movies", emoji: "🎬" },
  { id: "12", label: "Reading", emoji: "📚" },
  { id: "13", label: "Nature", emoji: "🌿" },
  { id: "14", label: "Coffee", emoji: "☕" },
  { id: "15", label: "Sports", emoji: "🏀" },
  { id: "16", label: "Fashion", emoji: "👗" },
  { id: "17", label: "Writing", emoji: "✍️" },
  { id: "18", label: "Tech", emoji: "🤖" },
  { id: "19", label: "Science", emoji: "🔬" },
  { id: "20", label: "Food", emoji: "🍕" },
];
