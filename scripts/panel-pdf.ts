/** Generic Agent Smith 360 report PDF — reads a panel JSON, attributes every agent. */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const JSON_PATH = process.argv[2] || "/tmp/panel.json";
const OUT = process.argv[3] || "/tmp/panel-360.pdf";
const TARGET = process.argv[4] || "";
const r = JSON.parse(readFileSync(JSON_PATH, "utf8"));
const target = TARGET || (r.pagesVisited?.[0]?.url ?? "");
const esc = (x: unknown) => String(x ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sev: Record<string, string> = { critical: "#ff3b3b", high: "#ff7a18", medium: "#ffd02e", low: "#7ad1ff", info: "#9aa0a6" };
const imp: Record<string, string> = { high: "#ff7a18", medium: "#ffd02e", low: "#7ad1ff" };
const ROLES: Record<string, { avatar: string; role: string; accent: string }> = {
  strategy: { avatar: "🧠", role: "Stratège produit & growth", accent: "#b388ff" },
  sales: { avatar: "💎", role: "Vente & conversion (CRO)", accent: "#ff5db1" },
  design: { avatar: "🔮", role: "Design & craft UI", accent: "#5bd1ff" },
  ceo: { avatar: "🕴️", role: "Vision CEO & arbitrages", accent: "#c9a24b" },
  seo: { avatar: "🔗", role: "SEO & visibilité LLM (GEO/AEO)", accent: "#7c5cff" },
  analytics: { avatar: "📊", role: "Visibilité & mesure (analytics)", accent: "#ff9f1c" },
};

async function main() {
  const b = await chromium.launch();
  const shotUrls = (r.pagesVisited || []).slice(0, 4).map((p: { url: string }) => p.url);
  const shots: { label: string; b64: string }[] = [];
  for (const url of shotUrls) {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 850 }, ignoreHTTPSErrors: true });
    const pg = await ctx.newPage();
    try { await pg.goto(url, { waitUntil: "networkidle", timeout: 40000 }); await pg.waitForTimeout(1200);
      let label = "/"; try { label = new URL(url).pathname || "/"; } catch {}
      shots.push({ label, b64: (await pg.screenshot()).toString("base64") }); } catch {}
    await ctx.close();
  }

  const s = r.scores, wf = r.workflow, sm = r.siteModel, advisors = r.advisors || [];
  const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const host = (() => { try { return new URL(target).host; } catch { return target; } })();
  const bar = (l: string, v: number) => `<div><div class="bh"><span>${l}</span><b>${v}</b></div><div class="tr"><div class="fl" style="width:${v}%;background:${v >= 80 ? "#18e26a" : v >= 60 ? "#ffd02e" : "#ff7a18"}"></div></div></div>`;

  const roster = `<table class="roster"><thead><tr><th>Agent</th><th>Responsable de</th><th>Reco. #1 (priorité)</th><th>#</th></tr></thead><tbody>
    <tr><td><b>🛠️ Escouade QA</b></td><td>Qualité technique (fonctionnel · UI · UX · sécurité · perf)</td><td>${esc(r.findings[0]?.title || "—")}</td><td>${r.findings.length}</td></tr>
    <tr><td><b>🧭 Agent (parcours)</b></td><td>Test du workflow principal</td><td>Verdict : ${esc(wf?.status).toUpperCase()} (${wf?.health}/100)</td><td>—</td></tr>
    ${advisors.map((a: { lens: string; agentName: string; topPriority: string; recommendations: unknown[] }) => `<tr><td><b>${ROLES[a.lens]?.avatar || "🤖"} ${esc(a.agentName)}</b></td><td>${esc(ROLES[a.lens]?.role || a.lens)}</td><td>${esc(a.topPriority).slice(0, 95)}…</td><td>${a.recommendations.length}</td></tr>`).join("")}
  </tbody></table>`;

  const findings = r.findings.map((f: { severity: string; category: string; title: string; recommendedFix: string }, i: number) => `<div class="fd"><div class="fh"><span class="sv" style="background:${sev[f.severity]}">${f.severity.toUpperCase()}</span><span class="fc">${f.category}</span><span class="ft">${i + 1}. ${esc(f.title)}</span></div><div class="fb"><p>${esc(f.recommendedFix)}</p></div></div>`).join("");

  const agentSection = (a: { lens: string; agentName: string; thesis: string; topPriority: string; recommendations: { impact: string; lever: string; title: string; observation: string; action: string }[] }) => {
    const m = ROLES[a.lens] || { avatar: "🤖", role: a.lens, accent: "#18e26a" };
    return `<section class="page pb"><div class="ah" style="border-color:${m.accent}55"><span class="av" style="background:${m.accent}1a;border-color:${m.accent}55">${m.avatar}</span><div><div class="an">${esc(a.agentName)}</div><div class="ar">Responsable : ${esc(m.role)}</div></div></div>
      <div class="co" style="border-color:${m.accent}"><b>Lecture —</b> ${esc(a.thesis)}</div><div class="co gr"><b>Priorité #1 —</b> ${esc(a.topPriority)}</div>
      ${a.recommendations.map((x) => `<div class="rc"><div class="rh"><span class="im" style="background:${imp[x.impact] || "#888"}22;color:${imp[x.impact] || "#888"}">${esc(x.impact).toUpperCase()}</span><span class="lv">${esc(x.lever)}</span><span class="rt">${esc(x.title)}</span></div><p><b>Constat —</b> ${esc(x.observation)}</p><p><b>Action —</b> ${esc(x.action)}</p></div>`).join("")}</section>`;
  };

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#13241a;margin:0;line-height:1.5}
  .page{padding:44px 52px}.cover{background:#04140b;color:#c8ffe0;min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:64px}
  .cover h1{font-size:60px;margin:0;color:#18e26a;letter-spacing:-2px}.cover .sub{font-size:19px;color:#7fe6ab;margin-top:10px}.cover .sc{font-size:88px;font-weight:800;color:#18e26a;margin:20px 0 0}.cover .meta{margin-top:30px;font-size:13px;color:#5fbf86;line-height:1.9}.brand{font-size:13px;letter-spacing:5px;text-transform:uppercase;color:#18e26a}
  h2{color:#0a7a3d;font-size:21px;margin:30px 0 6px;border-bottom:2px solid #18e26a33;padding-bottom:7px}
  .bars{display:grid;grid-template-columns:1fr 1fr;gap:12px 26px;margin-top:14px}.bh{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px}.tr{height:9px;background:#e6efe9;border-radius:6px;overflow:hidden}.fl{height:100%;border-radius:6px}
  .roster{width:100%;border-collapse:collapse;margin-top:12px;font-size:12.5px}.roster th{text-align:left;color:#0a7a3d;border-bottom:2px solid #18e26a33;padding:7px 8px}.roster td{border-bottom:1px solid #e6efe9;padding:7px 8px;vertical-align:top}
  .co{background:#fff7e6;border-left:4px solid #ffb02e;padding:12px 16px;border-radius:8px;margin:10px 0;font-size:13.5px;line-height:1.6}.co.gr{background:#eafff2;border-color:#18e26a}
  .gs{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px}.sh{margin:0;border:1px solid #dfe7e2;border-radius:10px;overflow:hidden}.sh img{width:100%;display:block}.sh figcaption{font-size:12px;padding:7px 10px;background:#f5faf7;color:#3a5a48}
  .fd{border:1px solid #e2ebe6;border-radius:10px;margin:8px 0;overflow:hidden}.fh{display:flex;align-items:center;gap:9px;padding:8px 12px;background:#f6faf8}.sv{color:#04140b;font-size:11px;font-weight:800;padding:2px 7px;border-radius:5px}.fc{font-size:11px;text-transform:uppercase;color:#6a8275}.ft{font-weight:700;font-size:13.5px}.fb{padding:8px 12px;font-size:13px}.fb p{margin:0}
  .ah{display:flex;align-items:center;gap:14px;border:1px solid;border-radius:14px;padding:14px 18px;background:#fbfdfc}.av{display:grid;place-items:center;width:52px;height:52px;border-radius:12px;border:1px solid;font-size:26px}.an{font-size:22px;font-weight:800}.ar{font-size:13px;color:#5a7565}
  .rc{border:1px solid #e7e0f5;border-radius:10px;margin:8px 0;padding:10px 13px;background:#faf9ff}.rh{display:flex;align-items:center;gap:9px;margin-bottom:4px}.im{font-size:10px;font-weight:800;padding:2px 7px;border-radius:5px}.lv{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8a6fc0}.rt{font-weight:700;font-size:13.5px;color:#2a1f44}.rc p{margin:2px 0;font-size:12.5px;line-height:1.5;color:#3a3550}
  .pb{page-break-before:always}footer{margin-top:24px;font-size:11px;color:#9aa0a6;text-align:center}</style></head><body>
  <section class="cover"><div class="brand">🕶️ Agent Smith · Le Conseil</div><h1>AUDIT 360</h1><div class="sub">${esc(host)} — ${esc(sm?.purpose || "")}</div><div class="sc">${s.overall}<span style="font-size:26px;color:#5fbf86">/100</span></div>
  <div class="meta">Cible : ${esc(target)}<br/>Date : ${date}<br/>Moteur : navigateur réel (Chromium local)<br/><b>Intelligence : Claude Code (claude -p) — 0 token API</b><br/>Agents : escouade QA + parcours + Néo · Trinity · Oracle · Morpheus · Link · Tank</div></section>
  <section class="page"><h2>🗂️ Qui a fait quoi (l'escouade)</h2>${roster}
  <h2>Scores (escouade QA)</h2><div class="bars">${bar("Fonctionnel", s.functional)}${bar("UI", s.ui)}${bar("UX", s.ux)}${bar("Sécurité", s.security)}${bar("Performance", s.performance)}${bar("Global", s.overall)}</div>
  <h2>🧭 Parcours principal</h2><p style="font-size:13.5px"><b>${esc(sm?.primaryWorkflow?.name)}</b> — entrée <code>${esc(sm?.primaryWorkflow?.entryPath)}</code> → succès <code>${esc(sm?.primaryWorkflow?.successSignal)}</code></p>
  <div class="co ${wf?.status === "pass" ? "gr" : ""}"><b>Verdict : ${esc(wf?.status).toUpperCase()}</b> (${wf?.health}/100). ${esc(wf?.why)}</div>
  <div class="gs">${shots.map((sh) => `<figure class="sh"><img src="data:image/png;base64,${sh.b64}"/><figcaption>${esc(sh.label)}</figcaption></figure>`).join("")}</div></section>
  <section class="page pb"><h2>🛠️ Escouade QA — findings techniques (${r.findings.length})</h2>${findings}</section>
  ${advisors.map(agentSection).join("")}
  <footer>Agent Smith · Audit 360 — moteur réel + intelligence Claude Code · ${date}</footer></body></html>`;

  const ctx = await b.newContext();
  const pg = await ctx.newPage();
  await pg.setContent(html, { waitUntil: "networkidle" });
  await pg.pdf({ path: OUT, format: "A4", printBackground: true, margin: { top: "0", bottom: "0", left: "0", right: "0" } });
  await b.close();
  console.error("PDF:", OUT);
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
