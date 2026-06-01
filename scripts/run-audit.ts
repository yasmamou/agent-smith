/**
 * Agent Smith — standalone audit CLI.
 *
 *   npm run audit:cli -- https://example.com [quick|standard|deep]
 *
 * Lets you (or Claude) run the audit engine directly against any URL and
 * print the full report + fix prompt, without the web app or a database.
 */
import { runAudit } from "../src/lib/audit/engine";
import type { AuditMode } from "../src/types";

async function main() {
  const url = process.argv[2];
  const mode = (process.argv[3] as AuditMode) || "standard";
  if (!url) {
    console.error("Usage: npm run audit:cli -- <url> [quick|standard|deep]");
    process.exit(1);
  }

  console.log(`\n🕶️  Agent Smith — auditing ${url} (${mode})\n`);
  const t0 = Date.now();
  const report = await runAudit({
    targetUrl: url,
    mode,
    agentsCount: 5,
    durationMinutes: 15,
  });

  console.log(`Engine:  ${report.engine}`);
  console.log(`Score:   ${report.scores.overall}/100`);
  console.log(
    `         functional ${report.scores.functional} · ui ${report.scores.ui} · ux ${report.scores.ux} · security ${report.scores.security} · perf ${report.scores.performance}`
  );
  console.log(`Pages:   ${report.pagesVisited.length}`);
  console.log(`Findings:${report.findings.length}\n`);

  for (const f of report.findings) {
    console.log(`  [${f.severity.toUpperCase().padEnd(8)}] (${f.category}) ${f.title}`);
  }

  console.log("\n──────── SUMMARY ────────");
  console.log(report.summary);
  console.log("\n──────── FIX PROMPT ────────\n");
  console.log(report.fixPrompt);
  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
