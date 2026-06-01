/**
 * On a Postgres target (i.e. Vercel/Neon/Supabase), push the Prisma schema so
 * the tables exist before the app boots. No-op for local SQLite builds.
 */
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL || "";
const isPostgres = /^postgres(ql)?:\/\//i.test(url);

if (!isPostgres) {
  console.log("[db-deploy] non-postgres target — skipping db push");
  process.exit(0);
}

try {
  console.log("[db-deploy] pushing Prisma schema to Postgres…");
  execSync("prisma db push --skip-generate", { stdio: "inherit" });
} catch (err) {
  console.error("[db-deploy] schema push failed:", err?.message || err);
  // Don't hard-fail the build; the app surfaces DB errors clearly at runtime.
  process.exit(0);
}
