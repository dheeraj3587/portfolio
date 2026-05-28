import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { MaterialAccentProvider } from "@/lib/theme/use-material-accent";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dheeraj Joshi — Android & Backend Developer",
  description:
    "Portfolio of Dheeraj Joshi, a final-year B.Tech (CSE) student building Android apps with Kotlin and Jetpack Compose, and backend services with Java and Spring Boot.",
  authors: [{ name: "Dheeraj Joshi" }],
  keywords: [
    "Dheeraj Joshi",
    "Android Developer",
    "Kotlin",
    "Jetpack Compose",
    "Spring Boot",
    "Backend Developer",
    "Portfolio",
  ],
  openGraph: {
    title: "Dheeraj Joshi — Android & Backend Developer",
    description:
      "Android apps with Kotlin and Jetpack Compose. Backend services with Java and Spring Boot.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <MaterialAccentProvider>{children}</MaterialAccentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
