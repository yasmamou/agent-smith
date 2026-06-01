import type {
  Finding,
  AuditScores,
  AuditConfig,
  PageVisit,
  TimelineEvent,
  Category,
  Severity,
} from "@/types";
import type { CrawlResult } from "./crawl-types";
import { ANALYSIS_AGENTS } from "@/lib/agents/registry";
import { safeHost } from "@/lib/utils";

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 28,
  high: 16,
  medium: 9,
  low: 4,
  info: 1,
};

const CATEGORY_WEIGHT: Record<Category, number> = {
  functional: 0.3,
  ux: 0.2,
  security: 0.2,
  ui: 0.15,
  performance: 0.15,
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computeScores(findings: Finding[]): AuditScores {
  const cats: Category[] = ["functional", "ui", "ux", "security", "performance"];
  const perCat: Record<Category, number> = {
    functional: 100,
    ui: 100,
    ux: 100,
    security: 100,
    performance: 100,
  };
  for (const f of findings) {
    perCat[f.category] -= SEVERITY_WEIGHT[f.severity];
  }
  for (const c of cats) perCat[c] = clamp(perCat[c]);

  const overall = clamp(
    cats.reduce((sum, c) => sum + perCat[c] * CATEGORY_WEIGHT[c], 0)
  );

  return {
    overall,
    functional: perCat.functional,
    ui: perCat.ui,
    ux: perCat.ux,
    security: perCat.security,
    performance: perCat.performance,
  };
}

export function toPageVisits(crawl: CrawlResult): PageVisit[] {
  return crawl.pages.map((p) => ({
    url: p.url,
    title: p.title,
    statusCode: p.statusCode,
    loadMs: p.loadMs,
    consoleErrors: p.consoleErrors.length,
    networkErrors: p.networkErrors.length,
  }));
}

/** PromptFixAgent — synthesises the master, ready-to-paste fix prompt. */
export function buildFixPrompt(findings: Finding[], config: AuditConfig): string {
  const host = safeHost(config.targetUrl);
  const ordered = [...findings].sort(
    (a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]
  );
  const top = ordered.slice(0, 12);

  const lines: string[] = [];
  lines.push(
    `You are a senior engineer working on the project behind ${host}. ` +
      `An automated QA audit (Agent Smith) found the issues below. ` +
      `Fix them WITHOUT breaking existing functionality. Work through them in priority order, ` +
      `keep changes minimal and well-scoped, and after each fix briefly note how you verified it.`
  );
  lines.push("");
  lines.push("## Issues to fix (highest priority first)");
  top.forEach((f, i) => {
    lines.push("");
    lines.push(`### ${i + 1}. [${f.severity.toUpperCase()} · ${f.category}] ${f.title}`);
    lines.push(`- Problem: ${f.description}`);
    lines.push(`- Likely cause: ${f.probableCause}`);
    lines.push(`- Fix: ${f.recommendedFix}`);
    if (f.evidence) lines.push(`- Evidence: ${f.evidence.split("\n")[0]}`);
  });
  lines.push("");
  lines.push("## Constraints");
  lines.push("- Do not introduce regressions; keep public APIs and routes stable.");
  lines.push("- Prefer the smallest change that fully resolves each issue.");
  lines.push("- Add/adjust tests where it makes sense.");
  lines.push("- After all fixes, run the build and report what changed.");

  return lines.join("\n");
}

export function buildUxSuggestions(findings: Finding[]): string[] {
  const ux = findings.filter((f) => f.category === "ux" || f.category === "ui");
  const base = ux.map((f) => f.recommendedFix);
  const extras = [
    "Add a persistent, single primary CTA per screen to guide the next action.",
    "Show loading skeletons instead of blank screens during data fetches.",
    "Confirm destructive actions and give users an undo path where possible.",
  ];
  return Array.from(new Set([...base, ...extras])).slice(0, 7);
}

export function buildTimeline(crawl: CrawlResult, findings: Finding[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  let t = 0;
  const step = (n = 1) => (t += 400 + n * 350);

  events.push({ t: step(), agent: "ExplorerAgent", action: `Booting crawl of ${safeHost(crawl.target)}`, status: "info" });
  if (!crawl.reachable) {
    events.push({ t: step(), agent: "ExplorerAgent", action: "Target unreachable", status: "error" });
    return events;
  }
  events.push({
    t: step(),
    agent: "ExplorerAgent",
    action: `Mapped ${crawl.pages.length} pages`,
    detail: crawl.pages.map((p) => p.url).slice(0, 4).join(", "),
    status: "ok",
  });

  for (const agent of ANALYSIS_AGENTS) {
    if (agent.meta.key === "explorer") continue;
    const count = findings.filter((f) => f.agent === agent.meta.name).length;
    events.push({
      t: step(2),
      agent: agent.meta.name,
      action: agent.meta.role,
      detail: count ? `${count} issue(s) found` : "no issues",
      status: count ? "warn" : "ok",
    });
  }

  events.push({
    t: step(),
    agent: "PromptFixAgent",
    action: "Compiled fix prompt + report",
    status: "ok",
  });
  return events;
}

export function buildMarkdown(args: {
  config: AuditConfig;
  scores: AuditScores;
  summary: string;
  findings: Finding[];
  uxSuggestions: string[];
  pages: PageVisit[];
  fixPrompt: string;
  engine: string;
  date: string;
}): string {
  const { config, scores, summary, findings, uxSuggestions, pages, fixPrompt, engine, date } = args;
  const host = safeHost(config.targetUrl);
  const bySeverity = (s: Severity) => findings.filter((f) => f.severity === s);
  const byCat = (c: Category) => findings.filter((f) => f.category === c);

  const findingMd = (f: Finding) =>
    [
      `#### ${f.title}`,
      `- **Severity:** ${f.severity} · **Category:** ${f.category} · **Agent:** ${f.agent}`,
      `- **Description:** ${f.description}`,
      `- **Evidence:**\n\n  \`\`\`\n  ${f.evidence.replace(/\n/g, "\n  ")}\n  \`\`\``,
      `- **Reproduction:**\n${f.reproductionSteps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`,
      `- **Probable cause:** ${f.probableCause}`,
      `- **Recommended fix:** ${f.recommendedFix}`,
    ].join("\n");

  const section = (title: string, items: Finding[]) =>
    items.length
      ? `\n### ${title}\n\n${items.map(findingMd).join("\n\n")}\n`
      : `\n### ${title}\n\n_No issues found._\n`;

  const md = `# Agent Smith — Audit Report

**Target:** ${config.targetUrl}
**Host:** ${host}
**Date:** ${date}
**Mode:** ${config.mode} · **Agents:** ${config.agentsCount} · **Engine:** ${engine}

---

## Executive Summary

**Overall score: ${scores.overall}/100**

| Functional | UI | UX | Security | Performance |
|:---:|:---:|:---:|:---:|:---:|
| ${scores.functional} | ${scores.ui} | ${scores.ux} | ${scores.security} | ${scores.performance} |

${summary}

**Issue counts:** ${bySeverity("critical").length} critical · ${bySeverity("high").length} high · ${bySeverity("medium").length} medium · ${bySeverity("low").length} low · ${bySeverity("info").length} info

---
${bySeverity("critical").length ? `\n## Critical Issues\n\n${bySeverity("critical").map(findingMd).join("\n\n")}\n\n---\n` : ""}
## Functional Bugs
${section("Functional", byCat("functional"))}
---

## UI / UX Improvements
${section("UI", byCat("ui"))}
${section("UX", byCat("ux"))}
**UX suggestions**
${uxSuggestions.map((s) => `- ${s}`).join("\n")}

---

## Security Light Review
> Passive review only — no brute force, injection or exploitation was performed.
${section("Security", byCat("security"))}
---

## Performance Review
${section("Performance", byCat("performance"))}
---

## Pages Visited

| Page | Status | Load | Console err | Network err |
|---|:---:|:---:|:---:|:---:|
${pages
  .map(
    (p) =>
      `| ${p.url} | ${p.statusCode} | ${(p.loadMs / 1000).toFixed(1)}s | ${p.consoleErrors} | ${p.networkErrors} |`
  )
  .join("\n")}

---

## Prompt to fix in Claude Code / Cursor

\`\`\`
${fixPrompt}
\`\`\`

---
_Generated by Agent Smith. You must be the owner of, or authorized to test, the target site._
`;
  return md;
}
