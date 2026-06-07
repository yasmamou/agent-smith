import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://agent-smith-iota.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "Agent Smith — AI QA agent that audits your app after every deploy",
    template: "%s · Agent Smith",
  },
  description:
    "Paste a URL: AI agents crawl your live app, test the flows, and hand you a scored report + a fix prompt ready for Claude Code or Cursor. Free instant audit, no signup.",
  keywords: ["AI QA automation", "automated website QA", "AI website testing", "QA agent", "Claude Code", "Cursor", "vibe coding", "web app audit"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Agent Smith — Autonomous QA for vibe-coded apps",
    description:
      "Paste a URL. Agents explore, test and report. Get an actionable fix prompt for Claude Code / Cursor.",
    type: "website",
    url: BASE,
    siteName: "Agent Smith",
    images: [{ url: "/agent-smith-og.png", width: 1200, height: 630, alt: "Agent Smith — AI QA agent" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Smith — Autonomous QA for vibe-coded apps",
    description: "Paste a URL. Agents test your app and hand you a fix prompt for Claude Code / Cursor.",
    images: ["/agent-smith-og.png"],
  },
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        {/* Dogfood: Agent Smith tracks its own visits with its own snippet. */}
        <script defer data-key="as_site_25b4db2d25f6b20f" src="/track.js" />
      </body>
    </html>
  );
}
