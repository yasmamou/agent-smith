#!/usr/bin/env node
/**
 * Agent Smith CLI — run an audit on the hosted engine and print the report.
 * Lets Claude Code / Cursor / CI close the loop: audit → fix → re-audit.
 *
 *   AGENT_SMITH_API_KEY=as_xxx node scripts/agent-smith.mjs <url> [type] [persona]
 *
 *   type    : technical (default) | persona | authenticated
 *   persona : lyceen | externe | interne   (for persona/authenticated)
 *   For authenticated audits, also set AGENT_SMITH_LOGIN and AGENT_SMITH_PASSWORD.
 *
 * Output: human-readable summary + a machine-readable JSON block (--json for JSON only).
 */
const BASE = process.env.AGENT_SMITH_URL || "https://agent-smith-iota.vercel.app";
const KEY = process.env.AGENT_SMITH_API_KEY;

const args = process.argv.slice(2).filter((a) => a !== "--json");
const jsonOnly = process.argv.includes("--json");
const [url, type = "technical", persona] = args;

if (!url || !KEY) {
  console.error("Usage: AGENT_SMITH_API_KEY=as_xxx node scripts/agent-smith.mjs <url> [type] [persona]");
  console.error("Get your key in the app → Dashboard → API.");
  process.exit(1);
}

const body = { targetUrl: url, type, persona };
if (type === "authenticated") {
  body.login = process.env.AGENT_SMITH_LOGIN;
  body.password = process.env.AGENT_SMITH_PASSWORD;
}

const res = await fetch(`${BASE}/api/v1/audit`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
  body: JSON.stringify(body),
});
const data = await res.json().catch(() => ({ error: "bad response" }));

if (jsonOnly) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(res.ok ? 0 : 1);
}

if (!res.ok) {
  console.error("Audit failed:", data.error || res.status);
  process.exit(1);
}

console.log(`\n🕶️  Agent Smith — ${url} (${type})`);
if (data.scores) {
  const s = data.scores;
  console.log(`Score: ${s.overall}/100  ·  functional ${s.functional} · ui ${s.ui} · ux ${s.ux} · security ${s.security} · perf ${s.performance}`);
}
if (data.journey) console.log(`Experience: ${data.journey.experienceScore}/100 · ${data.journey.steps.length} steps`);
console.log(`Report: ${data.url}\nPDF: ${data.pdfUrl}\n`);

if (data.findings?.length) {
  console.log("Findings:");
  for (const f of data.findings) console.log(`  [${(f.severity || "").toUpperCase().padEnd(8)}] (${f.category}) ${f.title}`);
}
if (data.summary) console.log(`\nSummary: ${data.summary}`);
if (data.fixPrompt) {
  console.log("\n──── FIX PROMPT (paste into Claude Code / Cursor) ────\n");
  console.log(data.fixPrompt);
}
console.log("\n──── JSON ────");
console.log(JSON.stringify({ id: data.id, scores: data.scores, findings: data.findings, url: data.url }, null, 0));
