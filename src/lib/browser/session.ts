/**
 * Shared browser session factory used by BOTH the audit engine and the persona
 * journey engine, so everything runs the same way online and locally.
 *
 * Connection priority:
 *  1. BROWSER_CDP_URL  → ANY remote Chrome over CDP (self-hosted browserless,
 *     your own server, etc.) — vendor-neutral, no per-session quota.
 *  2. BROWSERBASE_API_KEY → Browserbase hosted Chrome (convenience SaaS).
 *  3. Local/dev → full `playwright` with its bundled browser (free, unlimited).
 *  4. Serverless without any remote → playwright-core + @sparticuz/chromium
 *     (bare Vercel lacks libnss3, so this path usually fails → caller mocks).
 */
import type { Browser, BrowserContext } from "playwright-core";

export interface SessionOptions {
  viewport?: { width: number; height: number };
  userAgent?: string;
  /** label for the browser-pool lease (e.g. audit id / purpose) */
  holder?: string;
  /** how long to wait for a free Browserbase slot before giving up (ms) */
  maxWaitMs?: number;
}

export interface BrowserSession {
  browser: Pick<Browser, "close">;
  context: BrowserContext;
}

const DEFAULT_UA =
  "Mozilla/5.0 (AgentSmith QA Bot; +https://agentsmith.dev) Chrome/120 Safari/537.36";

export function isBrowserbaseConfigured() {
  return !!process.env.BROWSERBASE_API_KEY;
}

/** True when any remote Chrome (self-hosted CDP or Browserbase) is configured. */
export function isRemoteBrowserConfigured() {
  return !!(process.env.BROWSER_CDP_URL || process.env.BROWSERBASE_API_KEY);
}

/** Build the CDP endpoint for whatever remote browser is configured, or null. */
function remoteCdpUrl(): string | null {
  if (process.env.BROWSER_CDP_URL) return process.env.BROWSER_CDP_URL;
  const bbKey = process.env.BROWSERBASE_API_KEY;
  if (bbKey) {
    const projectId = process.env.BROWSERBASE_PROJECT_ID || "";
    return `wss://connect.browserbase.com?apiKey=${bbKey}${projectId ? `&projectId=${projectId}` : ""}`;
  }
  return null;
}

export async function launchSession(opts: SessionOptions = {}): Promise<BrowserSession> {
  const viewport = opts.viewport ?? { width: 1366, height: 850 };
  const userAgent = opts.userAgent ?? DEFAULT_UA;

  const cdpUrl = remoteCdpUrl();
  if (cdpUrl) {
    // Serialize remote sessions through the DB-backed pool (free tiers are often
    // ≈ 1 concurrent). Wait for a slot; if none frees in time, signal the caller
    // so it can fall back (mock for technical, loud failure for authenticated).
    const { acquireSlot } = await import("./pool");
    const slot = await acquireSlot(opts.holder ?? "audit", opts.maxWaitMs ?? 150_000);
    if (!slot) {
      const err = new Error("Browser pool busy — no free remote browser slot.");
      (err as Error & { code?: string }).code = "BROWSER_POOL_BUSY";
      throw err;
    }
    try {
      const { chromium } = await import("playwright-core");
      const browser = await chromium.connectOverCDP(cdpUrl);
      const context = browser.contexts()[0] ?? (await browser.newContext());
      // Release the slot when the browser closes (success or error path).
      const origClose = browser.close.bind(browser);
      browser.close = async () => {
        try { await origClose(); } finally { await slot.release(); }
      };
      return { browser, context };
    } catch (e) {
      await slot.release();
      throw e;
    }
  }

  const isServerless =
    process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME != null;
  if (isServerless) {
    const sparticuz = (await import("@sparticuz/chromium")).default;
    sparticuz.setGraphicsMode = false;
    const { chromium } = await import("playwright-core");
    const browser = await chromium.launch({
      args: [...sparticuz.args, "--disable-gpu", "--no-zygote"],
      executablePath: await sparticuz.executablePath(),
      headless: true,
    });
    const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
    return { browser, context };
  }

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, userAgent, ignoreHTTPSErrors: true });
  return { browser, context };
}
