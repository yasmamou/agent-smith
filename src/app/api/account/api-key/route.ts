import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { hashToken } from "@/lib/security/crypto";

function genKey() {
  return "as_" + crypto.randomBytes(24).toString("base64url");
}

async function issue(userId: string) {
  const key = genKey();
  await prisma.user.update({
    where: { id: userId },
    data: { apiKeyHash: hashToken(key), apiKeyPrefix: key.slice(0, 10) },
  });
  return key; // returned once, never stored in clear
}

// GET → returns the key only on first creation; otherwise just the prefix.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { apiKeyHash: true, apiKeyPrefix: true },
  });
  if (!user?.apiKeyHash) {
    const key = await issue(session.userId);
    return NextResponse.json({ apiKey: key, prefix: key.slice(0, 10), justCreated: true });
  }
  return NextResponse.json({ apiKey: null, prefix: user.apiKeyPrefix, hasKey: true });
}

// POST → rotate, returns the new key once.
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = await issue(session.userId);
  return NextResponse.json({ apiKey: key, prefix: key.slice(0, 10), justCreated: true });
}
