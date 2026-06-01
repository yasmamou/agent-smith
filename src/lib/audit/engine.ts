import type { AuditConfig, AuditReport, Finding, ScreenshotRef } from "@/types";
import type { CrawlResult } from "./crawl-types";
import { mockCrawl } from "./mock";
import { ANALYSIS_AGENTS } from "@/lib/agents/registry";
import {
  computeScores,
  toPageVisits,
  buildFixPrompt,
  buildUxSuggestions,
  buildTimeline,
  buildMarkdown,
} from "./report";
import { generateSummary } from "@/lib/ai/anthropic";
import { makeScreenshot } from "./screenshots";
import { formatDate } from "@/lib/utils";

async function crawl(config: AuditConfig): Promise<CrawlResult> {
  const forced = process.env.AUDIT_ENGINE?.toLowerCase();
  if (forced === "mock") return mockCrawl(config);

  // Try the REAL browser engine everywhere (local: full playwright; serverless:
  // playwright-core + @sparticuz/chromium). Fall back to the mock crawl on any
  // failure so an audit always completes.
  try {
    const { playwrightCrawl } = await import("./playwright-runner");
    const result = await playwrightCrawl(config);
    if (result.reachable && result.pages.length) return result;
    // unreachable with the real engine — keep the real result so we report it
    if (forced === "playwright") return result;
  } catch (err) {
    if (forced === "playwright") throw err;
    // otherwise fall through to the deterministic mock
  }
  return mockCrawl(config);
}

function buildScreenshots(crawl: CrawlResult, findings: Finding[]): ScreenshotRef[] {
  const shots: ScreenshotRef[] = [];
  const pages = crawl.pages.slice(0, 4);
  for (const p of pages) {
    const issue = findings.find((f) => f.evidence.includes(p.url));
    const isForm = p.forms > 0;
    const isError = p.statusCode >= 400;
    shots.push(
      makeScreenshot({
        url: p.url,
        title: p.title,
        variant: isError ? "error" : isForm ? "form" : "default",
        annotation: issue
          ? `${issue.severity.toUpperCase()}: ${issue.title}`
          : isError
            ? `HTTP ${p.statusCode}`
            : undefined,
        annotationColor: isError ? "#ff4d4d" : "#ff8a3d",
      })
    );
  }
  // a mobile shot for good measure
  if (crawl.pages[0]) {
    shots.push(
      makeScreenshot({
        url: crawl.pages[0].url,
        title: `${crawl.pages[0].title} (mobile)`,
        variant: "mobile",
        annotation: crawl.pages[0].hasViewportMeta ? undefined : "Missing viewport meta",
        annotationColor: "#ff8a3d",
      })
    );
  }
  return shots;
}

/**
 * runAudit — the core entry point. Orchestrates crawl → agents → scoring →
 * report. Always returns a complete AuditReport (never throws for normal
 * audit conditions; unreachable targets are reported as findings).
 */
export async function runAudit(config: AuditConfig): Promise<AuditReport> {
  const crawlResult = await crawl(config);

  // Run every analysis agent over the crawl.
  const findings: Finding[] = [];
  for (const agent of ANALYSIS_AGENTS) {
    try {
      findings.push(...agent.run(crawlResult));
    } catch {
      // an agent failing must never sink the whole audit
    }
  }

  const scores = computeScores(findings);
  const pages = toPageVisits(crawlResult);
  const uxSuggestions = buildUxSuggestions(findings);
  const fixPrompt = buildFixPrompt(findings, config);
  const timeline = buildTimeline(crawlResult, findings);
  const screenshots = buildScreenshots(crawlResult, findings);
  const summary = await generateSummary(findings, scores, config);
  const date = formatDate(new Date());

  const reportMarkdown = buildMarkdown({
    config,
    scores,
    summary,
    findings,
    uxSuggestions,
    pages,
    fixPrompt,
    engine: crawlResult.engine,
    date,
  });

  return {
    summary,
    scores,
    findings,
    uxSuggestions,
    securityFindings: findings.filter((f) => f.category === "security"),
    performanceFindings: findings.filter((f) => f.category === "performance"),
    pagesVisited: pages,
    screenshots,
    timeline,
    fixPrompt,
    reportMarkdown,
    engine: crawlResult.engine,
  };
}
