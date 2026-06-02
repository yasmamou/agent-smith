import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/resolve";
import { prisma } from "@/lib/db/client";
import { executeAudit } from "@/lib/audit/run-service";

// Audits can run for a while (real crawl / journey). Allow up to 5 minutes.
export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await resolveUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const audit = await prisma.audit.findFirst({ where: { id, userId: session.userId } });
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (audit.status === "running") return NextResponse.json({ ok: true, status: "running" });

  const result = await executeAudit(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
