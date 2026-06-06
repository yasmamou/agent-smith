/**
 * Shared browser session factory used by BOTH the audit engine and the persona
 * journey engine, so everything runs the same way online and locally.
 *
 *  - BROWSERBASE_API_KEY set → hosted Chrome over CDP (works on Vercel serverless)
 *  - Local/dev → full `playwright` with its bundled browser
 *  - Serverless without Browserbase → playwright-core + @sparticuz/chromium
 *    (note: bare Vercel lacks libnss3, so this path usually fails → caller mocks)
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

export async function launchSession(opts: SessionOptions = {}): Promise<BrowserSession> {
  const viewport = opts.viewport ?? { width: 1366, height: 850 };
  const userAgent = opts.userAgent ?? DEFAULT_UA;

  const bbKey = process.env.BROWSERBASE_API_KEY;
  if (bbKey) {
    // Serialize remote sessions through the DB-backed pool (Browserbase free tier
    // ≈ 1 concurrent). Wait for a slot; if none frees in time, signal the caller
    // so it can fall back (mock for technical, loud failure for authenticated).
    const { acquireSlot } = await import("./pool");
    const slot = await acquireSlot(opts.holder ?? "audit", opts.maxWaitMs ?? 150_000);
    if (!slot) {
      const err = new Error("Browser pool busy — no free Browserbase slot.");
      (err as Error & { code?: string }).code = "BROWSER_POOL_BUSY";
      throw err;
    }
    try {
      const projectId = process.env.BROWSERBASE_PROJECT_ID || "";
      const { chromium } = await import("playwright-core");
      const wsUrl = `wss://connect.browserbase.com?apiKey=${bbKey}${projectId ? `&projectId=${projectId}` : ""}`;
      const browser = await chromium.connectOverCDP(wsUrl);
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
