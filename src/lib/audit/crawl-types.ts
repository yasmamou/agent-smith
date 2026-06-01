/**
 * Intermediate representation produced by a crawl (real Playwright OR mock).
 * Agents consume CrawlResult and emit Findings — so both engines share the
 * exact same analysis pipeline.
 */

export interface CrawlCookie {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
}

export interface CrawlPage {
  url: string;
  title: string;
  statusCode: number;
  loadMs: number;
  domContentLoadedMs: number;
  consoleErrors: string[];
  networkErrors: { url: string; status: number }[];
  buttons: number;
  links: number;
  forms: number;
  inputsWithoutLabel: number;
  images: number;
  imagesMissingAlt: number;
  h1Count: number;
  hasViewportMeta: boolean;
  lowContrastSamples: number;
  brokenLinks: string[];
  hasAutofocusTrap: boolean;
  textLength: number;
}

export interface CrawlResult {
  engine: "playwright" | "mock";
  target: string;
  https: boolean;
  reachable: boolean;
  /** root-document response headers (lowercased keys) */
  headers: Record<string, string>;
  cookies: CrawlCookie[];
  pages: CrawlPage[];
  /** technical details leaked via headers / errors */
  techLeaks: string[];
  notes: string[];
  /** total wall-clock of crawl in ms */
  durationMs: number;
}

/** Security headers we check for (passive only). */
export const SECURITY_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
] as const;
