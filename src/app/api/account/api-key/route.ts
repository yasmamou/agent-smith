import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

function genKey() {
  return "as_" + crypto.randomBytes(24).toString("base64url");
}

// GET → current key (created on first request)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let user = await prisma.user.findUnique({ where: { id: session.userId }, select: { apiKey: true } });
  if (!user?.apiKey) {
    user = await prisma.user.update({ where: { id: session.userId }, data: { apiKey: genKey() }, select: { apiKey: true } });
  }
  return NextResponse.json({ apiKey: user.apiKey });
}

// POST → rotate
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.update({
    where: { id: session.userId },
    data: { apiKey: genKey() },
    select: { apiKey: true },
  });
  return NextResponse.json({ apiKey: user.apiKey });
}
