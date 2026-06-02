import { prisma } from "@/lib/db/client";
import { getSession } from "./session";

/**
 * Resolve the current user from EITHER an API key (Authorization: Bearer / x-api-key)
 * or the session cookie. Lets Claude Code / CI / MCP call the API with a key,
 * while the web app keeps using cookies.
 */
export async function resolveUser(req?: Request): Promise<{ userId: string; email: string } | null> {
  if (req) {
    const auth = req.headers.get("authorization") || "";
    const key = auth.match(/^bearer\s+(.+)$/i)?.[1] || req.headers.get("x-api-key") || undefined;
    if (key) {
      const u = await prisma.user.findUnique({
        where: { apiKey: key.trim() },
        select: { id: true, email: true },
      });
      if (u) return { userId: u.id, email: u.email };
    }
  }
  return getSession();
}
