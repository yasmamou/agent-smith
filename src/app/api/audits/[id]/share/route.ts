import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { resolveUser } from "@/lib/auth/resolve";
import { prisma } from "@/lib/db/client";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://agent-smith-iota.vercel.app";

function token(): string {
  // short, URL-safe, unguessable
  return "as_" + randomBytes(9).toString("base64url");
}

/** Enable (or return) a public share link + embeddable badge for an audit. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const audit = await prisma.audit.findFirst({ where: { id, userId: user.userId } });
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let shareId = audit.shareId;
  if (!shareId) {
    // generate a unique token (retry a couple times on the rare collision)
    for (let i = 0; i < 3 && !shareId; i++) {
      const candidate = token();
      try {
        await prisma.audit.update({ where: { id }, data: { shareId: candidate } });
        shareId = candidate;
      } catch { /* collision — retry */ }
    }
    if (!shareId) return NextResponse.json({ error: "Could not create share link" }, { status: 500 });
  }

  return NextResponse.json(buildShare(shareId));
}

/** Disable sharing. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const audit = await prisma.audit.findFirst({ where: { id, userId: user.userId } });
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.audit.update({ where: { id }, data: { shareId: null } });
  return NextResponse.json({ ok: true });
}

function buildShare(shareId: string) {
  const url = `${BASE}/r/${shareId}`;
  const badge = `${BASE}/api/badge/${shareId}.svg`;
  return {
    shareId,
    url,
    badgeUrl: badge,
    markdown: `[![Audited by Agent Smith](${badge})](${url})`,
    html: `<a href="${url}"><img src="${badge}" alt="Audited by Agent Smith" /></a>`,
  };
}
