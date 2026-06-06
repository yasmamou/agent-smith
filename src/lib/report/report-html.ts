import type { Finding, AuditScores, PageVisit, SiteModel, WorkflowResult } from "@/types";
import type { JourneyResult } from "@/lib/journey/types";
import { safeHost } from "@/lib/utils";

export interface ReportData {
  targetUrl: string;
  type: string;
  engine: string | null;
  persona: string | null;
  summary: string | null;
  scores: AuditScores | null;
  findings: Finding[];
  pagesVisited: PageVisit[];
  uxSuggestions: string[];
  fixPrompt: string | null;
  journey: JourneyResult | null;
  siteModel?: SiteModel | null;
  workflow?: WorkflowResult | null;
  date: string;
}

const SEV: Record<string, string> = {
  critical: "#c01919",
  high: "#c2410c",
  medium: "#d99a00",
  low: "#0f8f43",
  info: "#5b6f64",
};
const esc = (s: string) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const stars = (r: number) => {
  const f = Math.floor(r), h = r - f >= 0.5;
  return "★".repeat(f) + (h ? "½" : "") + "☆".repeat(Math.max(0, 5 - f - (h ? 1 : 0)));
};

const CSS = `
@page{size:A4;margin:14mm 13mm;} *{box-sizing:border-box;}
body{font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f1a14;font-size:12px;line-height:1.55;margin:0;}
.banner{background:linear-gradient(135deg,#06120c,#0c1f15);color:#e6f1ea;border-radius:14px;padding:20px 22px;display:flex;justify-content:space-between;align-items:center;}
.brand{display:flex;align-items:center;gap:10px;} .logo{width:30px;height:30px;border:1px solid #18e26a;border-radius:8px;display:grid;place-items:center;color:#18e26a;}
.brand b{font-size:15px;} .brand b span{color:#18e26a;} .banner .sub{color:#8aa396;font-size:11px;margin-top:2px;}
.scorebox{text-align:right;} .scorebox .n{font-size:32px;font-weight:800;color:#18e26a;line-height:1;} .scorebox .l{font-size:9.5px;color:#8aa396;letter-spacing:.1em;text-transform:uppercase;}
h2{font-size:15px;margin:18px 0 8px;padding-bottom:5px;border-bottom:2px solid #18e26a33;color:#0c2a1b;}
.meta{color:#33503f;margin:8px 0;}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10.5px;} th,td{border:1px solid #d9e4dd;padding:5px 8px;text-align:left;vertical-align:top;} th{background:#eef6f0;font-weight:600;}
.badge{display:inline-block;padding:1px 7px;border-radius:20px;border:1px solid;font-size:9.5px;font-weight:700;}
.bars div{margin:5px 0;} .bar{height:7px;border-radius:5px;background:#e2ece6;overflow:hidden;} .bar span{display:block;height:100%;}
.finding{border:1px solid #e6ddd3;border-left:4px solid #c2410c;border-radius:0 8px 8px 0;padding:9px 12px;margin:8px 0;break-inside:avoid;}
.finding .t{font-weight:700;font-size:12px;color:#0c2a1b;} .finding p{margin:3px 0;font-size:10.5px;color:#33503f;}
.step{display:flex;gap:10px;padding:9px 0;border-top:1px solid #eef3f0;break-inside:avoid;}
.step img{width:230px;height:auto;border:1px solid #d9e4dd;border-radius:8px;}
.obs{margin:3px 0 0 14px;padding:0;font-size:10px;color:#33503f;}
.stars{color:#d99a00;} .pill{display:inline-block;background:#eef6f0;border-radius:6px;padding:1px 6px;font-size:9.5px;color:#33503f;}
pre{background:#0c1410;color:#cfe9da;padding:11px 13px;border-radius:10px;font-size:9.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;}
.rec{background:#f3faf5;border-left:3px solid #18e26a;border-radius:0 8px 8px 0;padding:8px 12px;color:#264a38;margin:8px 0;font-size:10.5px;}
.foot{margin-top:16px;padding-top:9px;border-top:1px solid #e2ece6;color:#7c9388;font-size:9.5px;text-align:center;}
`;

const LOGO_SVG = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7l8-4 8 4v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" stroke-linejoin="round"/><circle cx="12" cy="11" r="2.2" fill="currentColor" stroke="none"/></svg>`;

function scoreColor(n: number) {
  if (n >= 85) return "#18a558";
  if (n >= 70) return "#0f8f43";
  if (n >= 50) return "#d99a00";
  return "#c2410c";
}

export function buildReportHtml(d: ReportData): string {
  const host = safeHost(d.targetUrl);
  const isJourney = (d.type === "persona" || d.type === "authenticated") && d.journey;
  const headScore = d.scores?.overall ?? 0;

  const banner = `<div class="banner">
    <div class="brand"><div class="logo">${LOGO_SVG}</div>
    <div><b>Agent<span>Smith</span></b><div class="sub">${
      isJourney ? "Rapport de parcours" : "Rapport d'audit"
    } · ${esc(host)} · ${d.engine || "engine"}${d.type !== "technical" ? ` · ${esc(d.type)}` : ""}</div></div></div>
    <div class="scorebox"><div class="n">${headScore}</div><div class="l">${isJourney ? "Expérience" : "Score"} / 100</div></div>
  </div>`;

  let body = "";

  if (isJourney && d.journey) {
    const j = d.journey;
    body += `<h2>Résumé du parcours</h2>
      <p class="meta">${j.personaAvatar} <b>${esc(j.personaName)}</b> — ${esc(j.goal)}</p>
      <div class="rec">${esc(j.narrative)}</div>`;
    if (j.gatedNote) body += `<div class="rec" style="border-left-color:#c2410c;background:#fff6f0;color:#7a3b1d">${esc(j.gatedNote)}</div>`;
    body += `<h2>Étapes (${j.steps.length})</h2>`;
    for (const s of j.steps) {
      body += `<div class="step">
        ${s.screenshot ? `<img src="${s.screenshot}"/>` : ""}
        <div style="flex:1">
          <div style="font-size:10px;margin-bottom:2px"><span class="pill">Étape ${s.index}</span> <span class="badge" style="color:${SEV[s.status === "blocked" ? "critical" : s.status === "gated" ? "high" : s.status === "partial" ? "medium" : "low"]};border-color:#d9e4dd">${esc(s.status)}</span> <span class="stars">${stars(s.rating)}</span> ${(s.loadMs / 1000).toFixed(1)}s</div>
          <div style="font-weight:700">${esc(s.title)}</div>
          <div style="font-size:10px;color:#5b6f64">${esc(s.action)}</div>
          <ul class="obs">${s.observations.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
        </div></div>`;
    }
  } else {
    // technical report
    const sc = d.scores;
    if (sc) {
      body += `<h2>Résumé exécutif</h2><p class="meta">${esc(d.summary || "")}</p>
      <div class="bars">
        ${([["functional","Fonctionnel"],["ui","UI"],["ux","UX"],["security","Sécurité (hygiène passive)"],["performance","Performance"]] as const)
          .map(([k,label]) => `<div><div style="display:flex;justify-content:space-between;font-size:10px"><span>${label}</span><b>${sc[k as keyof typeof sc]}</b></div><div class="bar"><span style="width:${sc[k as keyof typeof sc]}%;background:${scoreColor(sc[k as keyof typeof sc])}"></span></div></div>`)
          .join("")}
      </div>`;
    }
    if (d.siteModel || d.workflow) {
      const w = d.workflow;
      const stColor = w?.status === "pass" ? "#18a558" : w?.status === "blocked" ? "#c2410c" : "#5b6f64";
      body += `<h2>🧠 Compréhension &amp; test du workflow</h2>`;
      if (d.siteModel) body += `<p class="meta"><b>Type d'app :</b> ${esc(d.siteModel.appType)} — ${esc(d.siteModel.purpose)}</p>`;
      if (w) {
        body += `<div class="rec" style="border-left-color:${stColor}"><b>Workflow « ${esc(w.goal)} » → <span style="color:${stColor}">${esc(w.status)}</span></b><br>${esc(w.why)}</div>`;
        if (w.steps?.length) body += `<ol style="font-size:10px;color:#33503f;margin:4px 0 0 16px">${w.steps.map((s) => `<li>${esc(s.action)} ${esc(s.target)}${s.note ? " — " + esc(s.note) : ""}</li>`).join("")}</ol>`;
      }
    }
    if (d.findings.length) {
      body += `<h2>Findings (${d.findings.length})</h2>`;
      const ordered = [...d.findings].sort(
        (a, b) => (["critical", "high", "medium", "low", "info"].indexOf(a.severity)) - ["critical", "high", "medium", "low", "info"].indexOf(b.severity)
      );
      for (const f of ordered) {
        body += `<div class="finding" style="border-left-color:${SEV[f.severity]}">
          <div class="t"><span class="badge" style="background:${SEV[f.severity]}1f;color:${SEV[f.severity]};border-color:${SEV[f.severity]}55">${f.severity.toUpperCase()}</span> ${esc(f.title)} <span style="color:#7c9388;font-weight:400">· ${esc(f.category)}</span></div>
          <p>${esc(f.description)}</p>
          ${f.evidence ? `<p style="color:#7a5238"><b>Preuve :</b> ${esc(f.evidence.split("\n")[0])}</p>` : ""}
          <p style="color:#264a38"><b>Correctif :</b> ${esc(f.recommendedFix)}</p>
        </div>`;
      }
    }
    if (d.pagesVisited.length) {
      body += `<h2>Pages visitées</h2><table><tr><th>Page</th><th>Statut</th><th>Chargement</th><th>Console</th><th>Réseau</th></tr>
        ${d.pagesVisited.map((p) => `<tr><td style="font-family:monospace;font-size:9px">${esc(p.url)}</td><td>${p.statusCode}</td><td>${(p.loadMs / 1000).toFixed(1)}s</td><td>${p.consoleErrors}</td><td>${p.networkErrors}</td></tr>`).join("")}
      </table>`;
    }
    if (d.fixPrompt) {
      body += `<h2>Prompt correctif (Claude Code / Cursor)</h2><pre>${esc(d.fixPrompt)}</pre>`;
    }
  }

  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
    ${banner}
    <p class="meta" style="font-size:10px">Cible : ${esc(d.targetUrl)} · Date : ${esc(d.date)}</p>
    ${body}
    <div class="foot">Généré par Agent Smith — audit passif & non-destructif. Tester uniquement des sites autorisés.</div>
  </body></html>`;
}
