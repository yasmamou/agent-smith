import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { safeHost } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const audit = await prisma.audit.findFirst({ where: { id, userId: session.userId } });
  if (!audit || !audit.reportMarkdown) return new Response("Not found", { status: 404 });

  const filename = `agent-smith-${safeHost(audit.targetUrl).replace(/[^a-z0-9]/gi, "-")}.md`;
  return new Response(audit.reportMarkdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
