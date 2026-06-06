import { prisma } from "@/lib/db/client";
import { parseScores } from "@/lib/db/audits";

/**
 * Embeddable SVG badge for a shared audit: "Agent Smith | 94".
 * GET /api/badge/<shareId>.svg  → shields.io-style badge, colored by score.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shareId = id.replace(/\.svg$/i, "");

  const audit = await prisma.audit
    .findFirst({ where: { shareId }, select: { scores: true, status: true } })
    .catch(() => null);

  const score = audit?.status === "completed" ? parseScores(audit.scores)?.overall ?? null : null;
  const value = score === null ? "n/a" : String(score);
  const color = score === null ? "#9aa0a6" : score >= 80 ? "#18e26a" : score >= 60 ? "#ffb02e" : "#ff5a5a";

  const label = "🕶 Agent Smith";
  const labelW = 96;
  const valueW = 44;
  const total = labelW + valueW;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#04140b"/>
    <rect x="${labelW}" width="${valueW}" height="20" fill="${color}"/>
    <rect width="${total}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelW / 2}" y="14" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelW / 2}" y="13">${label}</text>
    <text x="${labelW + valueW / 2}" y="14" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelW + valueW / 2}" y="13">${value}</text>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // short cache so the badge reflects re-runs reasonably fast
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
