import { prisma } from "@/lib/db/client";

export interface SiteMetrics {
  rangeDays: number;
  visits: number;
  uniques: number;
  newVisitors: number;
  totalVisits: number;
  conversions: { event: string; count: number }[];
  topPages: { label: string; count: number }[];
  topReferrers: { label: string; count: number }[];
  countries: { label: string; count: number }[];
  devices: { label: string; count: number }[];
  series: { day: string; visits: number }[];
}

function host(ref: string | null): string {
  if (!ref) return "Direct / none";
  try { return new URL(ref).hostname.replace(/^www\./, ""); } catch { return ref.slice(0, 40); }
}

export async function getSiteMetrics(siteKey: string, rangeDays = 7): Promise<SiteMetrics> {
  const since = new Date(Date.now() - rangeDays * 86_400_000);
  const pv = { siteKey, event: "pageview", createdAt: { gte: since } };

  const [visits, totalVisits, newVisitors, uniqueRows, pages, countries, devices, refRows, convRows] = await Promise.all([
    prisma.pageHit.count({ where: pv }),
    prisma.pageHit.count({ where: { siteKey, event: "pageview" } }),
    prisma.pageHit.count({ where: { ...pv, isNew: true } }),
    prisma.pageHit.findMany({ where: pv, distinct: ["visitorHash"], select: { visitorHash: true } }),
    prisma.pageHit.groupBy({ by: ["path"], where: pv, _count: { path: true }, orderBy: { _count: { path: "desc" } }, take: 6 }),
    prisma.pageHit.groupBy({ by: ["country"], where: pv, _count: { country: true }, orderBy: { _count: { country: "desc" } }, take: 6 }),
    prisma.pageHit.groupBy({ by: ["device"], where: pv, _count: { device: true }, orderBy: { _count: { device: "desc" } }, take: 4 }),
    prisma.pageHit.findMany({ where: pv, select: { referrer: true } }),
    prisma.pageHit.groupBy({ by: ["event"], where: { siteKey, event: { not: "pageview" }, createdAt: { gte: since } }, _count: { event: true } }),
  ]);

  // referrers → bucket by host in JS
  const refMap = new Map<string, number>();
  for (const r of refRows) { const h = host(r.referrer); refMap.set(h, (refMap.get(h) ?? 0) + 1); }
  const topReferrers = [...refMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, count]) => ({ label, count }));

  // daily series (bounded count queries)
  const series: { day: string; visits: number }[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const start = new Date(Date.now() - i * 86_400_000);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86_400_000);
    const c = await prisma.pageHit.count({ where: { siteKey, event: "pageview", createdAt: { gte: start, lt: end } } });
    series.push({ day: start.toISOString().slice(5, 10), visits: c });
  }

  return {
    rangeDays,
    visits,
    uniques: uniqueRows.length,
    newVisitors,
    totalVisits,
    conversions: convRows.map((c) => ({ event: c.event, count: c._count.event })).sort((a, b) => b.count - a.count),
    topPages: pages.map((p) => ({ label: p.path, count: p._count.path })),
    topReferrers,
    countries: countries.map((c) => ({ label: c.country || "—", count: c._count.country })),
    devices: devices.map((d) => ({ label: d.device || "—", count: d._count.device })),
    series,
  };
}
