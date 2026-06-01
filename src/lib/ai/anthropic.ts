import type { Finding, AuditScores, AuditConfig } from "@/types";
import { safeHost } from "@/lib/utils";

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
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return deterministicSummary(findings, scores, config);

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: key });
    const compact = findings
      .slice(0, 16)
      .map((f) => `- [${f.severity}/${f.category}] ${f.title}`)
      .join("\n");

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content:
            `Write a crisp 3-4 sentence executive summary for a web QA audit of ${safeHost(
              config.targetUrl
            )}. Overall score ${scores.overall}/100 (functional ${scores.functional}, ui ${scores.ui}, ux ${scores.ux}, security ${scores.security}, performance ${scores.performance}). ` +
            `Findings:\n${compact}\n\n` +
            `Be direct and developer-focused. No preamble, no markdown headers, just the summary text.`,
        },
      ],
    });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n")
      .trim();
    return text || deterministicSummary(findings, scores, config);
  } catch {
    return deterministicSummary(findings, scores, config);
  }
}
