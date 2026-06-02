import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  const agent = await prisma.customAgent.findFirst({ where: { slug, userId: session.userId } });
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.customAgent.delete({ where: { id: agent.id } });
  return NextResponse.json({ ok: true });
}
