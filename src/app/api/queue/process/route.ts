import { NextResponse } from "next/server";
import { drainQueue } from "@/lib/audit/queue";

// The drainer may run an audit to completion; give it the full window.
export const maxDuration = 300;

/**
 * Queue drainer — triggered by Vercel Cron (safety net) and callable manually.
 * Auth: if QUEUE_SECRET or CRON_SECRET is set, require it (Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>`); otherwise the endpoint is open (the
 * work is idempotent and bounded — it only runs already-created, already-paid
 * audits).
 */
function authorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const queueSecret = process.env.QUEUE_SECRET;
  if (!cronSecret && !queueSecret) return true;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.match(/^bearer\s+(.+)$/i)?.[1];
  if (cronSecret && bearer === cronSecret) return true;
  if (queueSecret && req.headers.get("x-queue-secret") === queueSecret) return true;
  return false;
}

async function handle(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await drainQueue();
  return NextResponse.json({ ok: true, ...result });
}

// Vercel Cron uses GET; manual triggers can use POST.
export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
