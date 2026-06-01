import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agent Smith — Your AI QA agent after every vibe-coded deploy",
  description:
    "Agent Smith runs autonomous QA agents over your web app, finds functional, UI, UX, security and performance issues, and hands you a ready-to-paste fix prompt for Claude Code or Cursor.",
  keywords: ["QA", "AI agent", "automated testing", "Claude Code", "Cursor", "vibe coding", "audit"],
  openGraph: {
    title: "Agent Smith — Autonomous QA for vibe-coded apps",
    description:
      "Paste a URL. Agents explore, test and report. Get an actionable fix prompt for Claude Code / Cursor.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
