import type { CrawlResult, CrawlPage, CrawlCookie } from "./crawl-types";
import type { AuditConfig } from "@/types";

/**
 * Real browser crawl via Playwright. Imported dynamically so the app builds
 * and runs even when Playwright (or its browsers) aren't installed — the
 * engine catches failures and falls back to the mock crawler.
 *
 * PASSIVE only: it navigates, observes and reads the DOM. It never brute
 * forces, injects payloads, or performs destructive actions.
 */

// In-browser page analysis (runs inside page.evaluate).
const PAGE_ANALYSIS_FN = `() => {
  const lowContrast = () => {
    let count = 0;
    const parse = (c) => {
      const m = c.match(/\\d+(\\.\\d+)?/g);
      if (!m) return null;
      return m.slice(0, 3).map(Number);
    };
    const lum = (rgb) => {
      const a = rgb.map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };
    const els = Array.from(document.querySelectorAll('p,span,a,li,button,h1,h2,h3,label'));
    for (const el of els.slice(0, 400)) {
      const text = (el.textContent || '').trim();
      if (text.length < 3) continue;
      const s = getComputedStyle(el);
      const fg = parse(s.color);
      let bgEl = el, bg = null;
      while (bgEl && !bg) {
        const bs = getComputedStyle(bgEl).backgroundColor;
        if (bs && bs !== 'rgba(0, 0, 0, 0)' && bs !== 'transparent') bg = parse(bs);
        bgEl = bgEl.parentElement;
      }
      if (!fg || !bg) continue;
      const l1 = lum(fg) + 0.05, l2 = lum(bg) + 0.05;
      const ratio = l1 > l2 ? l1 / l2 : l2 / l1;
      if (ratio < 4.5) count++;
    }
    return count;
  };
  const imgs = Array.from(document.images);
  const inputs = Array.from(document.querySelectorAll('input,select,textarea'))
    .filter((i) => !['hidden','submit','button'].includes(i.type));
  const unlabeled = inputs.filter((i) => {
    if (i.getAttribute('aria-label') || i.getAttribute('aria-labelledby')) return false;
    if (i.id && document.querySelector('label[for="' + CSS.escape(i.id) + '"]')) return false;
    if (i.closest('label')) return false;
    return true;
  });
  return {
    title: document.title || location.pathname,
    h1Count: document.querySelectorAll('h1').length,
    hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
    images: imgs.length,
    imagesMissingAlt: imgs.filter((i) => !i.hasAttribute('alt')).length,
    buttons: document.querySelectorAll('button,[role="button"]').length,
    links: document.querySelectorAll('a[href]').length,
    forms: document.querySelectorAll('form').length,
    inputsWithoutLabel: unlabeled.length,
    lowContrastSamples: lowContrast(),
    textLength: (document.body && document.body.innerText || '').length,
    internalLinks: Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.href)
      .filter((h) => h.startsWith(location.origin))
      .slice(0, 40),
  };
}`;

export async function playwrightCrawl(config: AuditConfig): Promise<CrawlResult> {
  // dynamic import keeps playwright out of the serverless bundle path
  const { chromium } = await import("playwright");
  const target = config.targetUrl;
  const https = target.startsWith("https://");
  const start = Date.now();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (AgentSmith QA Bot; +https://agentsmith.dev) Chrome/120 Safari/537.36",
    ignoreHTTPSErrors: true,
  });

  const headers: Record<string, string> = {};
  const techLeaks: string[] = [];
  const pages: CrawlPage[] = [];
  const visited = new Set<string>();
  let reachable = true;

  const pageBudget = config.mode === "quick" ? 3 : config.mode === "deep" ? 8 : 5;
  const origin = (() => {
    try {
      return new URL(target).origin;
    } catch {
      return target;
    }
  })();

  const queue: string[] = [target];

  try {
    while (queue.length && pages.length < pageBudget) {
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      const page = await context.newPage();
      const consoleErrors: string[] = [];
      const networkErrors: { url: string; status: number }[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 240));
      });
      page.on("requestfailed", (req) =>
        networkErrors.push({ url: req.url().slice(0, 160), status: 0 })
      );
      page.on("response", (res) => {
        if (res.status() >= 400)
          networkErrors.push({ url: res.url().slice(0, 160), status: res.status() });
      });

      let statusCode = 0;
      let domContentLoadedMs = 0;
      const t0 = Date.now();
      try {
        const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        domContentLoadedMs = Date.now() - t0;
        statusCode = resp?.status() ?? 0;

        // capture root headers once
        if (url === target && resp) {
          const h = resp.headers();
          for (const [k, v] of Object.entries(h)) headers[k.toLowerCase()] = v;
          if (headers["server"]) techLeaks.push(`Server: ${headers["server"]}`);
          if (headers["x-powered-by"]) techLeaks.push(`X-Powered-By: ${headers["x-powered-by"]}`);
        }
        await page.waitForLoadState("load", { timeout: 8000 }).catch(() => {});
      } catch {
        if (url === target) reachable = false;
        await page.close();
        continue;
      }
      const loadMs = Date.now() - t0;

      let analysis: Record<string, unknown> = {};
      try {
        analysis = (await page.evaluate(`(${PAGE_ANALYSIS_FN})()`)) as Record<string, unknown>;
      } catch {
        analysis = {};
      }

      const internal = (analysis.internalLinks as string[]) ?? [];
      for (const link of internal) {
        const clean = link.split("#")[0];
        if (clean.startsWith(origin) && !visited.has(clean) && !queue.includes(clean)) {
          queue.push(clean);
        }
      }

      pages.push({
        url,
        title: (analysis.title as string) ?? url,
        statusCode,
        loadMs,
        domContentLoadedMs,
        consoleErrors,
        networkErrors,
        buttons: (analysis.buttons as number) ?? 0,
        links: (analysis.links as number) ?? 0,
        forms: (analysis.forms as number) ?? 0,
        inputsWithoutLabel: (analysis.inputsWithoutLabel as number) ?? 0,
        images: (analysis.images as number) ?? 0,
        imagesMissingAlt: (analysis.imagesMissingAlt as number) ?? 0,
        h1Count: (analysis.h1Count as number) ?? 0,
        hasViewportMeta: (analysis.hasViewportMeta as boolean) ?? false,
        lowContrastSamples: (analysis.lowContrastSamples as number) ?? 0,
        brokenLinks: [],
        hasAutofocusTrap: false,
        textLength: (analysis.textLength as number) ?? 0,
      });

      await page.close();
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const cookiesRaw = await context.cookies().catch(() => []);
  const cookies: CrawlCookie[] = cookiesRaw.map((c) => ({
    name: c.name,
    secure: !!c.secure,
    httpOnly: !!c.httpOnly,
    sameSite: (c.sameSite as string) || "unset",
  }));

  if (!pages.length) reachable = false;

  return {
    engine: "playwright",
    target,
    https,
    reachable,
    headers,
    cookies,
    pages,
    techLeaks,
    notes: [`Live crawl via Playwright — ${pages.length} page(s)`],
    durationMs: Date.now() - start,
  };
}
