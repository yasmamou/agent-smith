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
    const projectId = process.env.BROWSERBASE_PROJECT_ID || "";
    const { chromium } = await import("playwright-core");
    const wsUrl = `wss://connect.browserbase.com?apiKey=${bbKey}${projectId ? `&projectId=${projectId}` : ""}`;
    const browser = await chromium.connectOverCDP(wsUrl);
    const context = browser.contexts()[0] ?? (await browser.newContext());
    return { browser, context };
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
