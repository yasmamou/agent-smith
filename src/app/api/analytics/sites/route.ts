import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

/** List the user's tracked sites. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sites = await prisma.trackedSite.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, domain: true, key: true, createdAt: true },
  });
  return NextResponse.json({ sites });
}

/** Register a site to track → returns its public key + snippet. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  let domain = String(body?.domain || "").trim().toLowerCase();
  if (!domain) return NextResponse.json({ error: "Domaine requis" }, { status: 400 });
  domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  const key = "as_site_" + randomBytes(8).toString("hex");
  const site = await prisma.trackedSite.create({
    data: { userId: session.userId, domain, key },
    select: { id: true, domain: true, key: true, createdAt: true },
  });
  return NextResponse.json({ site });
}
