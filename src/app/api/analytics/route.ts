import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getSiteMetrics } from "@/lib/analytics/aggregate";

/** Metrics for one of the user's tracked sites: GET /api/analytics?site=<key>&days=7 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const u = new URL(req.url);
  const key = u.searchParams.get("site") || "";
  const days = Math.min(90, Math.max(1, parseInt(u.searchParams.get("days") || "7", 10) || 7));

  const site = await prisma.trackedSite.findFirst({
    where: { key, userId: session.userId },
    select: { key: true, domain: true },
  });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const metrics = await getSiteMetrics(site.key, days);
  return NextResponse.json({ domain: site.domain, ...metrics });
}
