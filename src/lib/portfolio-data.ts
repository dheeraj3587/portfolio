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
  { id: "typescript", name: "TypeScript", src: "/icons/tech/typescript.svg" },
  { id: "javascript", name: "JavaScript", src: "/icons/tech/js.svg" },
  { id: "python", name: "Python", src: "/icons/tech/python.svg" },
  { id: "java", name: "Java", src: "/icons/tech/java.svg" },
  { id: "nodejs", name: "Node.js", src: "/icons/tech/nodejs.svg" },
  { id: "react", name: "React", src: "/icons/tech/react.svg" },
  {
    id: "nextjs",
    name: "Next.js",
    src: "/icons/tech/nextjs2-dark.svg",
    invertOnLight: true,
  },
  {
    id: "tailwindcss",
    name: "Tailwind CSS",
    src: "/icons/tech/tailwindcss.svg",
  },
  {
    id: "express",
    name: "Express.js",
    src: "/icons/tech/express.png",
    invertOnDark: true,
  },
  { id: "hono", name: "Hono.js", src: "/icons/brands/honojs.png" },
  { id: "git", name: "Git", src: "/icons/tech/git.svg" },
  {
    id: "github",
    name: "GitHub",
    src: "/icons/social/github.png",
    invertOnDark: true,
  },
  { id: "mongodb", name: "MongoDB", src: "/icons/tech/mongodb.svg" },
  { id: "mysql", name: "MySQL", src: "/icons/tech/mysql.svg" },
  { id: "figma", name: "Figma", src: "/icons/tech/figma.svg" },
  { id: "postman", name: "Postman", src: "/icons/tools/postman.webp" },
  { id: "nginx", name: "Nginx", src: "/icons/tech/nginx.png" },
  { id: "bun", name: "Bun", src: "/icons/tech/bun.svg" },
  { id: "cursor", name: "Cursor AI", src: "/icons/tools/cursor-ai.png" },
  {
    id: "react-router",
    name: "React Router",
    src: "/icons/tech/react-router-dark.svg",
    invertOnLight: true,
  },
  {
    id: "react-navigation",
    name: "React Navigation",
    src: "/icons/tech/react-navigation.svg",
  },
  {
    id: "shadcn",
    name: "Shadcn UI",
    src: "/icons/tech/shadcn-ui-dark.svg",
    invertOnLight: true,
  },
  {
    id: "socket",
    name: "Socket.IO",
    src: "/icons/brands/socket_io.svg",
    socketIcon: true,
  },
];

const projectOnlyTech: TechItem[] = [
  { id: "android", name: "Android", src: "/icons/tech/android.svg" },
  { id: "kotlin", name: "Kotlin", src: "/icons/tech/kotlin.svg" },
  {
    id: "jetpack-compose",
    name: "Jetpack Compose",
    src: "/icons/tech/jetpack-compose.svg",
  },
  {
    id: "android-studio",
    name: "Android Studio",
    src: "/icons/tech/android-studio.svg",
  },
  { id: "gradle", name: "Gradle", src: "/icons/tech/gradle.svg" },
  { id: "firebase", name: "Firebase", src: "/icons/tech/firebase.svg" },
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
