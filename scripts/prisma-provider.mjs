/**
 * Selects the Prisma datasource provider based on DATABASE_URL.
 *
 *  - postgres:// or postgresql://  → "postgresql"  (Vercel / Neon / Supabase)
 *  - anything else / unset         → "sqlite"      (local zero-setup dev)
 *
 * Vercel injects DATABASE_URL into the build environment, so production
 * builds automatically switch to Postgres with no manual schema edits.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "..", "prisma", "schema.prisma");

const url = process.env.DATABASE_URL || "";
const isPostgres = /^postgres(ql)?:\/\//i.test(url);
const provider = isPostgres ? "postgresql" : "sqlite";

let schema = readFileSync(schemaPath, "utf8");
const next = schema.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*")[^"]+(")/s,
  `$1${provider}$2`
);

if (next !== schema) {
  writeFileSync(schemaPath, next);
  console.log(`[prisma-provider] set provider = "${provider}"`);
} else {
  console.log(`[prisma-provider] provider already "${provider}"`);
}
