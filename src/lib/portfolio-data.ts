export type TechItem = {
  id: string;
  name: string;
  src: string;
  invertOnDark?: boolean;
  invertOnLight?: boolean;
  socketIcon?: boolean;
};

export const profile = {
  name: "Dheeraj Joshi",
  shortName: "Dheeraj",
  initials: "DJ",
  location: "India",
  email: "dheerajjoshicontact@gmail.com",
  phone: "+91 70609 29418",
  pronouns: "he/him",
  githubUsername: "dheeraj3587",
  available: "Open to work",
  tagline: "Android & Backend Developer",
  bio: "Final-year B.Tech (CSE) student building polished Android apps and backend services end-to-end. I work with Kotlin, Jetpack Compose, and Spring Boot — from Room persistence to JWT-secured REST APIs.",
  roles: [
    "Android Developer",
    "Backend Developer",
    "Kotlin Engineer",
    "Spring Boot Developer",
    "Mobile Engineer",
    "Problem Solver",
  ],
};

export const navItems = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Components", href: "#components" },
];

export const socialLinks = {
  github: "https://github.com/dheeraj3587",
  linkedin: "https://www.linkedin.com/in/dheeraj-joshi",
  leetcode: "https://leetcode.com/u/Dheeraj031224/",
  codeforces: "https://codeforces.com/profile/joshidheeraj8782",
  email: "mailto:dheerajjoshicontact@gmail.com",
  phone: "tel:+917060929418",
};

export const stats = [
  { value: "500+", label: "DSA Problems" },
  { value: "7+", label: "Months Experience" },
  { value: "3", label: "Live Projects" },
  { value: "2026", label: "Graduating" },
];

export const techStack: TechItem[] = [
  // Languages
  { id: "kotlin", name: "Kotlin", src: "/icons/tech/kotlin.svg" },
  { id: "java", name: "Java", src: "/icons/tech/java.svg" },
  { id: "typescript", name: "TypeScript", src: "/icons/tech/typescript.svg" },
  { id: "python", name: "Python", src: "/icons/tech/python.svg" },

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
  { id: "spring-boot", name: "Spring Boot", src: "/icons/tech/java.svg" },
  { id: "jwt", name: "JWT", src: "/icons/tech/rest-api.svg" },
  { id: "ai", name: "AI", src: "/icons/tech/ai.svg" },
  { id: "react", name: "React", src: "/icons/tech/react.svg" },
];

export const techById = new Map(
  [...techStack, ...projectOnlyTech].map((tech) => [tech.id, tech]),
);

export type Project = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  links: { github?: string; site?: string };
  stack: string[];
  device?: "android" | "ios";
  showcaseKickers?: ReadonlyArray<{ screenId: string; kicker: string }>;
};

export const projects: Project[] = [
  {
    id: "chime",
    title: "Chime (Voxa)",
    subtitle: "Real-Time Chat App",
    description:
      "Real-time 1:1 chat with live message delivery, read receipts, typing indicators, online presence, and FCM push notifications. Built with Jetpack Compose, Hilt DI, and the repository pattern.",
    image:
      "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1200&auto=format&fit=crop",
    links: {
      github: "https://github.com/dheeraj3587/Chime",
    },
    stack: ["kotlin", "jetpack-compose", "firebase", "hilt", "mvvm"],
    device: "android",
    showcaseKickers: [
      { screenId: "inbox-001", kicker: "Realtime chat" },
      { screenId: "chat-001", kicker: "Push delivery" },
      { screenId: "compose-001", kicker: "Compose UI" },
    ],
  },
  {
    id: "lumen",
    title: "Lumen",
    subtitle: "AI Creative Assistant",
    description:
      "Concept ideation for fashion and motion photographers — generate moodboards, hooks, and shot lists from a one-line prompt. Native Android app built with Kotlin and Jetpack Compose, featuring a custom liquid-metal hero animation.",
    image: "/images/projects/lumen-cover.png",
    links: { github: "https://github.com/dheeraj3587/lumen" },
    stack: ["kotlin", "jetpack-compose", "android", "ai"],
    device: "ios",
    showcaseKickers: [
      { screenId: "home-001", kicker: "Voice-first AI" },
      { screenId: "results-001", kicker: "Moodboards" },
      { screenId: "moodboard-001", kicker: "Shot lists" },
    ],
  },
];

export const experience = [
  {
    role: "Final-year Student & Freelance Developer",
    company: "Independent",
    location: "Remote · Building",
    date: "2025 — Present",
    body: "Building Android apps and backend services end-to-end while completing my final year of B.Tech.",
    bullets: [
      "Shipped Chime, a real-time chat app with Firebase Realtime DB, FCM push, presence, and read receipts on Jetpack Compose",
      "Built Lead Management CRM with Spring Boot, JWT auth, service-layer RBAC, and a normalized PostgreSQL schema",
      "Solved 500+ DSA problems on LeetCode and Codeforces with consistent top-percentile contest performance",
    ],
    stack: ["kotlin", "java", "jetpack-compose", "firebase", "postgresql", "git"],
    active: true,
  },
  {
    role: "Software Engineering Evaluator",
    company: "Outlier AI",
    location: "Remote · Contract",
    date: "Nov 2024 — Jun 2025",
    body: "Reviewed AI-generated code and authored technical prompts for a production code generation model.",
    bullets: [
      "Caught bugs in lifecycle handling, coroutine scope leaks, and JPA query patterns across Kotlin and Java code over 7+ months",
      "Wrote technical prompts covering Android (Room, ViewModel, Retrofit) and backend (Spring Boot, REST design) topics, improving model output quality",
    ],
    stack: ["kotlin", "java", "android-studio", "git"],
    active: false,
  },
];

export const education = [
  {
    school: "Graphic Era Hill University",
    location: "Dehradun, India",
    degree: "B.Tech, Computer Science & Engineering",
    date: "2022 — 2026",
    coursework: ["Data Structures & Algorithms", "DBMS", "Operating Systems", "Computer Networks", "OOP"],
  },
];

export const footerLinks = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Components", href: "#components" },
];
