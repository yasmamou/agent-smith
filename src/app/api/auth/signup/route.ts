import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { signupSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, name: name || null, passwordHash },
  });

  await createSession({ userId: user.id, email: user.email });
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
}
