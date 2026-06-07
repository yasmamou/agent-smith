/**
 * Agent Smith — LOCAL audit runner. Runs the FULL real engine in-process with
 * the local Playwright Chromium on your machine. No Browserbase, no cloud, no
 * quota, free and unlimited. Ideal for Claude Code / Cursor / CI loops.
 *
 *   npm run audit:local -- <url> [type] [options]
 *   npx tsx scripts/local-audit.ts <url> [type] [options]
 *
 *   type     : technical (default) | authenticated
 *   options  :
 *     --writes              interactive write-path test (fill/submit forms)
 *     --instructions "..."  extra guidance for the AI layer
 *     --out report.json     write the full report JSON here
 *     --fix fix.md          write the consolidated fix prompt here (default: agent-smith-fix.md)
 *     --json                print full report JSON to stdout
 *   For authenticated: set LOGIN and PASSWORD env vars (or AGENT_SMITH_LOGIN/PASSWORD).
 *
 * Example:
 *   npm run audit:local -- https://example.com
 *   LOGIN=a@b.c PASSWORD=secret npm run audit:local -- https://app.com authenticated --writes
 */
import { writeFileSync } from "node:fs";
import { runAudit } from "../src/lib/audit/engine";

// Force the REAL local browser: ignore any remote CDP / Browserbase config and
// never silently fall back to mock.
delete process.env.BROWSER_CDP_URL;
delete process.env.BROWSERBASE_API_KEY;
process.env.AUDIT_ENGINE = "playwright";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function has(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  // drop values that belong to value-flags
  const flagValues = new Set(
    ["--instructions", "--out", "--fix"].map(arg).filter(Boolean) as string[]
  );
  const clean = positional.filter((a) => !flagValues.has(a));
  const url = clean[0];
  const type = clean[1] || "technical";

  if (!url) {
    console.error("Usage: npm run audit:local -- <url> [technical|authenticated] [--writes] [--out report.json]");
    process.exit(1);
  }

  const allowWrites = has("--writes");
  const instructions = arg("--instructions");
  const outPath = arg("--out");
  const fixPath = arg("--fix") || "agent-smith-fix.md";
  const jsonOnly = has("--json");

  const config = {
    targetUrl: url,
    mode: "standard" as const,
    agentsCount: 5,
    durationMinutes: 15,
    instructions,
  };

  let creds: { email: string; password: string } | undefined;
  if (type === "authenticated") {
    const email = process.env.LOGIN || process.env.AGENT_SMITH_LOGIN;
    const password = process.env.PASSWORD || process.env.AGENT_SMITH_PASSWORD;
    if (!email || !password) {
      console.error("Authenticated audit needs LOGIN and PASSWORD env vars.");
      process.exit(1);
    }
    creds = { email, password };
  }

  if (!jsonOnly) {
    console.error(`\n🕶️  Agent Smith — local audit of ${url} (${type})${allowWrites ? " · write-path" : ""}`);
    console.error("   Real local Chromium · no cloud · this may take 20–90s…\n");
  }

  const advisor = has("--seo") ? "seo" : has("--ceo") ? "ceo" : has("--sales") ? "sales" : has("--design") ? "design" : has("--strategy") ? "strategy" : undefined;
  const report = await runAudit(config, { allowWrites, creds, runWorkflow: true, advisor });

  if (jsonOnly) {
    process.stdout.write(JSON.stringify(report, null, 2));
    return;
  }

  // Human summary
  const s = report.scores;
  console.log(`Engine     : ${report.engine}${report.engine === "mock" ? "  ⚠️  SIMULÉ (le navigateur réel a échoué)" : ""}`);
  console.log(`Overall    : ${s.overall}/100`);
  console.log(`  fonctionnel ${s.functional} · ui ${s.ui} · ux ${s.ux} · sécurité ${s.security} · perf ${s.performance}`);
  if (report.workflow) {
    console.log(`Workflow   : ${report.workflow.status}${report.workflow.health != null ? ` (health ${report.workflow.health})` : ""}${report.siteModel?.primaryWorkflow ? ` — ${report.siteModel.primaryWorkflow.name}` : ""}`);
  }
  console.log(`Findings   : ${report.findings.length}`);
  const bySev = (sev: string) => report.findings.filter((f) => f.severity === sev).length;
  console.log(`  critical ${bySev("critical")} · high ${bySev("high")} · medium ${bySev("medium")} · low ${bySev("low")} · info ${bySev("info")}`);
  console.log("\nTop findings:");
  report.findings
    .filter((f) => ["critical", "high", "medium"].includes(f.severity))
    .slice(0, 8)
    .forEach((f) => console.log(`  [${f.severity.toUpperCase()}] ${f.title} — ${f.recommendedFix.slice(0, 90)}`));

  if (report.strategy) {
    console.log(`\n🧠 ${report.strategy.agentName || "Conseil"} (${report.strategy.lens || "strategy"}):`);
    console.log(`   ${report.strategy.topPriority}`);
    report.strategy.recommendations.slice(0, 8).forEach((r) =>
      console.log(`   [${r.impact.toUpperCase()} · ${r.lever}] ${r.title}`)
    );
  }

  if (report.fixPrompt) {
    writeFileSync(fixPath, report.fixPrompt);
    console.log(`\n📝 Prompt correctif → ${fixPath}`);
  }
  if (outPath) {
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`📦 Rapport complet → ${outPath}`);
  }
  console.log("");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("\n❌ Audit failed:", err?.message || err);
    process.exit(1);
  }
);
