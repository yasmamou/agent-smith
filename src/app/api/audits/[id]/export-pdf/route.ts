import { getSession } from "@/lib/auth/session";
import { getAuditWithRelations, parseScores, parseJson, findingFromRow } from "@/lib/db/audits";
import { buildReportHtml } from "@/lib/report/report-html";
import { renderPdf } from "@/lib/browser/pdf";
import { formatDate, safeHost } from "@/lib/utils";
import type { PageVisit } from "@/types";
import type { JourneyResult } from "@/lib/journey/types";

export const maxDuration = 120;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const audit = await getAuditWithRelations(id, session.userId);
  if (!audit) return new Response("Not found", { status: 404 });

  const html = buildReportHtml({
    targetUrl: audit.targetUrl,
    type: audit.type,
    engine: audit.engine,
    persona: audit.persona,
    summary: audit.summary,
    scores: parseScores(audit.scores),
    findings: audit.findings.map(findingFromRow),
    pagesVisited: parseJson<PageVisit[]>(audit.pagesVisited, []),
    uxSuggestions: parseJson<string[]>(audit.uxSuggestions, []),
    fixPrompt: audit.fixPrompt,
    journey: audit.journeyData ? parseJson<JourneyResult | null>(audit.journeyData, null) : null,
    date: formatDate(audit.completedAt ?? audit.createdAt),
  });

  try {
    const pdf = await renderPdf(html);
    const filename = `agent-smith-${safeHost(audit.targetUrl).replace(/[^a-z0-9]/gi, "-")}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    // Fallback: return the HTML so the user can print-to-PDF from the browser.
    const msg = err instanceof Error ? err.message : "pdf error";
    return new Response(
      html.replace("</body>", `<script>/* ${msg} */ window.onload=()=>setTimeout(()=>window.print(),400)</script></body>`),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
