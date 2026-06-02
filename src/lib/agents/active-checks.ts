import type { Finding } from "@/types";
import type { CrawlResult } from "@/lib/audit/crawl-types";
import { makeFinding } from "./base";

/**
 * ACTIVE security probes — only run when explicitly selected by a custom agent
 * AND the user confirmed authorization. STRICTLY NON-DESTRUCTIVE:
 *  - GET requests only
 *  - single-quote / boolean / harmless reflection markers
 *  - no DROP/DELETE/UPDATE, no brute force, request count capped
 */

const SQL_SIGNATURES = [
  /sql syntax/i,
  /mysql_fetch|mysqli?_/i,
  /ORA-\d{4,}/,
  /PostgreSQL.*ERROR|pg_query/i,
  /SQLite\/JDBC|sqlite3?\.OperationalError/i,
  /unclosed quotation mark/i,
  /quoted string not properly terminated/i,
  /SQLSTATE\[/i,
  /near ".*": syntax error/i,
  /Warning.*\bpg_|Warning.*\bmysql/i,
];

function candidateUrls(crawl: CrawlResult, max = 6): { url: string; param: string }[] {
  const out: { url: string; param: string }[] = [];
  const seen = new Set<string>();
  for (const p of crawl.pages) {
    try {
      const u = new URL(p.url);
      for (const [k] of u.searchParams) {
        const key = u.origin + u.pathname + "#" + k;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ url: p.url, param: k });
        }
      }
    } catch {
      /* ignore */
    }
  }
  // common probe params on the entry origin if nothing found
  if (out.length === 0) {
    try {
      const origin = new URL(crawl.target).origin;
      for (const k of ["id", "q", "search", "page"]) out.push({ url: `${origin}/?${k}=1`, param: k });
    } catch {
      /* ignore */
    }
  }
  return out.slice(0, max);
}

async function fetchText(url: string): Promise<{ status: number; text: string } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "AgentSmith QA Bot (+https://agentsmith.dev)" },
      redirect: "follow",
    });
    clearTimeout(t);
    const text = (await res.text()).slice(0, 200000);
    return { status: res.status, text };
  } catch {
    return null;
  }
}

function withParam(url: string, param: string, value: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set(param, value);
    return u.toString();
  } catch {
    return url;
  }
}

export async function runActiveChecks(crawl: CrawlResult, selectedIds: string[]): Promise<Finding[]> {
  const findings: Finding[] = [];
  const targets = candidateUrls(crawl);

  // ---- SQL injection probe ----
  if (selectedIds.includes("sql-injection") && targets.length) {
    let hit: { url: string; sig: string } | null = null;
    for (const t of targets) {
      const probed = withParam(t.url, t.param, "1'\"");
      const r = await fetchText(probed);
      if (!r) continue;
      const sig = SQL_SIGNATURES.find((re) => re.test(r.text));
      if (sig) {
        hit = { url: probed, sig: r.text.match(sig)?.[0]?.slice(0, 80) || "SQL error signature" };
        break;
      }
    }
    findings.push(
      hit
        ? makeFinding({
            agent: "SecurityActiveAgent",
            title: "Possible injection SQL (signature d'erreur SQL renvoyée)",
            severity: "critical",
            category: "security",
            description:
              "Une charge non destructive (guillemet) dans un paramètre d'URL fait renvoyer une signature d'erreur SQL — indice fort d'une requête non paramétrée vulnérable à l'injection SQL.",
            evidence: `${hit.url}\n› ${hit.sig}`,
            reproductionSteps: [
              `Ouvre ${hit.url}`,
              "Observe le message d'erreur SQL dans la réponse",
              "Confirmer manuellement avant tout test plus poussé (autorisé uniquement)",
            ],
            probableCause: "Concaténation de l'entrée utilisateur dans une requête SQL sans requête paramétrée.",
            recommendedFix:
              "Utiliser des requêtes paramétrées / un ORM, valider et échapper les entrées, et masquer les messages d'erreur en production.",
            fixPromptBlock:
              `Corriger une vulnérabilité d'injection SQL sur le paramètre testé (${hit.url}). Remplacer toute concaténation SQL par des requêtes paramétrées/préparées, valider les entrées, et ne jamais renvoyer de messages d'erreur SQL bruts en production.`,
          })
        : makeFinding({
            agent: "SecurityActiveAgent",
            title: "Sonde injection SQL — aucune signature détectée",
            severity: "info",
            category: "security",
            description:
              `Sonde non destructive exécutée sur ${targets.length} point(s) d'entrée : aucune signature d'erreur SQL renvoyée. (Absence de signal ≠ absence totale de vulnérabilité.)`,
            evidence: targets.map((t) => `${t.url} [param ${t.param}]`).join("\n"),
            reproductionSteps: ["Voir les URLs testées ci-dessus"],
            probableCause: "—",
            recommendedFix: "Continuer à utiliser des requêtes paramétrées partout.",
            fixPromptBlock: "Aucune action — sonde SQL passée sans signal.",
          })
    );
  }

  // ---- Reflected XSS probe ----
  if (selectedIds.includes("xss-reflected") && targets.length) {
    const marker = "as_xss_probe_7q3z";
    let hit: string | null = null;
    for (const t of targets) {
      const probed = withParam(t.url, t.param, `"><b>${marker}</b>`);
      const r = await fetchText(probed);
      if (!r) continue;
      if (r.text.includes(`<b>${marker}</b>`)) {
        hit = probed;
        break;
      }
    }
    if (hit) {
      findings.push(
        makeFinding({
          agent: "SecurityActiveAgent",
          title: "Possible XSS réfléchi (marqueur HTML réfléchi sans échappement)",
          severity: "high",
          category: "security",
          description:
            "Un marqueur HTML inoffensif injecté dans un paramètre d'URL est réfléchi dans la page sans échappement — indice de XSS réfléchi.",
          evidence: hit,
          reproductionSteps: [`Ouvre ${hit}`, "Inspecte le HTML : le marqueur apparaît non échappé"],
          probableCause: "Entrée utilisateur insérée dans le HTML sans encodage de sortie.",
          recommendedFix:
            "Encoder/échapper toute sortie utilisateur (textContent, échappement HTML), appliquer une CSP stricte.",
          fixPromptBlock:
            `Corriger un XSS réfléchi (${hit}). Échapper/encoder toute entrée réfléchie dans le HTML et ajouter une Content-Security-Policy stricte.`,
        })
      );
    }
  }

  return findings;
}
