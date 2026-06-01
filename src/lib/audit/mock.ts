import type { CrawlResult, CrawlPage } from "./crawl-types";
import type { AuditConfig } from "@/types";
import { safeHost } from "@/lib/utils";

/** Tiny deterministic PRNG (mulberry32) seeded from the target URL. */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const COMMON_PATHS = [
  { path: "/", title: "Home" },
  { path: "/login", title: "Sign in" },
  { path: "/signup", title: "Create account" },
  { path: "/dashboard", title: "Dashboard" },
  { path: "/pricing", title: "Pricing" },
  { path: "/settings", title: "Settings" },
  { path: "/profile", title: "Profile" },
  { path: "/billing", title: "Billing" },
  { path: "/docs", title: "Documentation" },
  { path: "/contact", title: "Contact" },
];

const CONSOLE_SAMPLES = [
  "Uncaught TypeError: Cannot read properties of undefined (reading 'map')",
  "Warning: Each child in a list should have a unique \"key\" prop.",
  "Uncaught (in promise) Error: Failed to fetch /api/user",
  "Hydration failed because the server rendered HTML didn't match the client",
  "ReferenceError: analytics is not defined",
];

const NET_SAMPLES = [
  { url: "/api/user/me", status: 401 },
  { url: "/api/analytics/track", status: 0 },
  { url: "/api/projects", status: 500 },
  { url: "/assets/hero-old.png", status: 404 },
  { url: "/api/billing/plan", status: 403 },
];

export function mockCrawl(config: AuditConfig): CrawlResult {
  const target = config.targetUrl;
  const rng = makeRng(hashString(target + config.mode));
  const https = target.startsWith("https://");

  const pageCount =
    config.mode === "quick" ? 3 : config.mode === "deep" ? Math.min(COMMON_PATHS.length, 8) : 5;

  const base = (() => {
    try {
      return new URL(target).origin;
    } catch {
      return target.replace(/\/+$/, "");
    }
  })();

  const pages: CrawlPage[] = [];
  for (let i = 0; i < pageCount; i++) {
    const def = COMMON_PATHS[i];
    const r = rng();
    const isAppPage = def.path === "/dashboard" || def.path === "/settings" || def.path === "/billing";
    const isForm = def.path === "/login" || def.path === "/signup" || def.path === "/contact";

    const loadMs = Math.round(700 + rng() * (isAppPage ? 4200 : 2200));
    const statusCode = r > 0.92 ? (rng() > 0.5 ? 500 : 404) : 200;
    const consoleErrors =
      rng() > 0.55 ? CONSOLE_SAMPLES.slice(0, 1 + Math.floor(rng() * 2)) : [];
    const networkErrors =
      rng() > 0.6 ? NET_SAMPLES.slice(0, 1 + Math.floor(rng() * 2)) : [];

    pages.push({
      url: `${base}${def.path}`,
      title: def.title,
      statusCode,
      loadMs,
      domContentLoadedMs: Math.round(loadMs * (0.55 + rng() * 0.2)),
      consoleErrors,
      networkErrors,
      buttons: 3 + Math.floor(rng() * 12),
      links: 6 + Math.floor(rng() * 30),
      forms: isForm ? 1 : rng() > 0.7 ? 1 : 0,
      inputsWithoutLabel: isForm && rng() > 0.5 ? 1 + Math.floor(rng() * 2) : 0,
      images: Math.floor(rng() * 8),
      imagesMissingAlt: rng() > 0.6 ? Math.floor(rng() * 3) : 0,
      h1Count: rng() > 0.85 ? (rng() > 0.5 ? 0 : 2) : 1,
      hasViewportMeta: rng() > 0.2,
      lowContrastSamples: rng() > 0.55 ? 1 + Math.floor(rng() * 4) : 0,
      brokenLinks: rng() > 0.8 ? [`${base}/old-link`, `${base}/beta`] : [],
      hasAutofocusTrap: false,
      textLength: def.path === "/dashboard" && rng() > 0.5 ? 120 : 400 + Math.floor(rng() * 2000),
    });
  }

  // Root headers — deliberately omit several to surface security findings.
  const headers: Record<string, string> = {
    "content-type": "text/html; charset=utf-8",
    server: rng() > 0.5 ? "Vercel" : "nginx/1.24.0",
  };
  if (rng() > 0.5) headers["x-content-type-options"] = "nosniff";
  if (rng() > 0.7) headers["strict-transport-security"] = "max-age=63072000";
  if (rng() > 0.85) headers["content-security-policy"] = "default-src 'self'";

  const techLeaks: string[] = [];
  if (headers["server"]) techLeaks.push(`Server: ${headers["server"]}`);
  if (rng() > 0.6) techLeaks.push("X-Powered-By: Next.js");

  const cookies = [
    {
      name: "session",
      secure: https && rng() > 0.4,
      httpOnly: rng() > 0.3,
      sameSite: rng() > 0.5 ? "Lax" : "None",
    },
    { name: "_analytics", secure: https && rng() > 0.6, httpOnly: false, sameSite: "Lax" },
  ];

  return {
    engine: "mock",
    target,
    https,
    reachable: true,
    headers,
    cookies,
    pages,
    techLeaks,
    notes: [`Mock crawl of ${safeHost(target)} — ${pageCount} pages`],
    durationMs: pages.reduce((s, p) => s + p.loadMs, 0),
  };
}
