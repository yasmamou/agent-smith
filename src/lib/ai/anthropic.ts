import type { Finding, AuditScores, AuditConfig } from "@/types";
import { safeHost } from "@/lib/utils";
import { aiEnabled, aiComplete } from "./provider";

/**
 * Optional AI narrative. When ANTHROPIC_API_KEY is set, Claude writes the
 * executive summary. Otherwise a deterministic summary is used. Either way
 * the audit works — the key only upgrades the prose.
 */

function deterministicSummary(
  findings: Finding[],
  scores: AuditScores,
  config: AuditConfig
): string {
  const host = safeHost(config.targetUrl);
  const crit = findings.filter((f) => f.severity === "critical").length;
  const high = findings.filter((f) => f.severity === "high").length;
  const verdict =
    scores.overall >= 85
      ? "in strong shape"
      : scores.overall >= 70
        ? "solid but with clear room to improve"
        : scores.overall >= 50
          ? "shippable but carrying real risk"
          : "fragile and in need of attention before further launch";

  const weakest = (["functional", "ux", "ui", "security", "performance"] as const).reduce(
    (min, c) => (scores[c] < scores[min] ? c : min),
    "functional" as const
  );

  return (
    `Agent Smith ran ${config.agentsCount} simulated agents across ${host} in ${config.mode} mode and scored it ${scores.overall}/100 — ${verdict}. ` +
    `${crit ? `${crit} critical and ` : ""}${high} high-severity issue(s) stand out, with **${weakest}** the weakest dimension (${scores[weakest]}/100). ` +
    `Prioritise the critical and high findings below; the ready-to-paste fix prompt at the end resolves them in one pass.`
  );
}

export async function generateSummary(
  findings: Finding[],
  scores: AuditScores,
  config: AuditConfig
): Promise<string> {
  if (!aiEnabled()) return deterministicSummary(findings, scores, config);

  const compact = findings
    .slice(0, 16)
    .map((f) => `- [${f.severity}/${f.category}] ${f.title}`)
    .join("\n");

  const text = await aiComplete(
    `Rédige un résumé exécutif percutant de 3-4 phrases pour un audit QA web de ${safeHost(
      config.targetUrl
    )}. Score global ${scores.overall}/100 (fonctionnel ${scores.functional}, ui ${scores.ui}, ux ${scores.ux}, sécurité ${scores.security}, performance ${scores.performance}).\n` +
      `Problèmes détectés :\n${compact}\n\n` +
      `Sois direct, orienté développeur, en français. Pas de préambule ni de titre, juste le texte du résumé.`,
    { maxTokens: 400 }
  );
  return text || deterministicSummary(findings, scores, config);
}
