import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";

/**
 * Agent Smith Analytics — ingest endpoint. Called by the snippet on external
 * sites, so it's CORS-open and privacy-friendly: NO cookie, NO raw IP stored —
 * only a daily-salted visitor hash. Params (query or JSON body):
 *   k = site key · p = path · r = referrer · e = event (default "pageview")
 * Responds with a 1x1 gif (works as a no-JS pixel too).
 */

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function device(ua: string): string {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

async function record(params: { k?: string; p?: string; r?: string; e?: string }, req: Request) {
  const key = (params.k || "").trim();
  if (!key) return;
  const site = await prisma.trackedSite.findUnique({ where: { key }, select: { key: true } }).catch(() => null);
  if (!site) return; // unknown key → ignore (no leak)

  const ua = req.headers.get("user-agent") || "";
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "0";
  const day = new Date().toISOString().slice(0, 10);
  const visitorHash = createHash("sha256").update(`${ip}|${ua}|${key}|${day}`).digest("hex").slice(0, 32);
  const country = (req.headers.get("x-vercel-ip-country") || "").toUpperCase() || null;

  // "new" = first hit today for this (daily) visitor on this site
  const seen = await prisma.pageHit.count({ where: { siteKey: key, visitorHash } }).catch(() => 1);

  await prisma.pageHit
    .create({
      data: {
        siteKey: key,
        path: (params.p || "/").slice(0, 300),
        referrer: (params.r || "").slice(0, 300) || null,
        country,
        device: device(ua),
        visitorHash,
        isNew: seen === 0,
        event: (params.e || "pageview").slice(0, 40),
      },
    })
    .catch(() => {});
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  await record(
    { k: u.searchParams.get("k") || undefined, p: u.searchParams.get("p") || undefined, r: u.searchParams.get("r") || undefined, e: u.searchParams.get("e") || undefined },
    req
  );
  return new Response(GIF, {
    status: 200,
    headers: { ...CORS, "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  await record({ k: body.k, p: body.p, r: body.r, e: body.e }, req);
  return NextResponse.json({ ok: true }, { headers: CORS });
}
