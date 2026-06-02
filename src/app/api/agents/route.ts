import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { z } from "zod";
import { slugId } from "@/lib/utils";
import { SPECIALTIES, CHECKS } from "@/lib/agents/catalog";

const agentSchema = z.object({
  name: z.string().trim().min(2).max(50),
  specialty: z.string().refine((s) => SPECIALTIES.some((sp) => sp.key === s), "Spécialité inconnue"),
  description: z.string().max(300).optional(),
  checks: z.array(z.string()).min(1, "Sélectionne au moins un check").max(40),
  aiInstructions: z.string().max(800).optional(),
  avatar: z.string().max(8).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const agents = await prisma.customAgent.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    agents: agents.map((a) => ({ ...a, checks: JSON.parse(a.checks || "[]") })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = agentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;
  // keep only known check ids
  const checks = d.checks.filter((c) => CHECKS.some((x) => x.id === c));
  const spec = SPECIALTIES.find((s) => s.key === d.specialty)!;

  const agent = await prisma.customAgent.create({
    data: {
      userId: session.userId,
      slug: slugId("agent"),
      name: d.name,
      specialty: d.specialty,
      description: d.description || null,
      checks: JSON.stringify(checks),
      aiInstructions: d.aiInstructions || null,
      avatar: d.avatar || spec.avatar,
      accent: spec.accent,
    },
  });
  return NextResponse.json({ ok: true, slug: agent.slug });
}
