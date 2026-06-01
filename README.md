<div align="center">

# 🕶️ Agent Smith

### Your AI QA agent after every vibe-coded deployment

Paste a URL → a swarm of QA agents explores your app, finds functional, UI, UX,
security and performance issues → you get a scored report **and a fix prompt
ready to paste into Claude Code or Cursor.**

`Next.js 15` · `TypeScript` · `Tailwind v4` · `Prisma` · `Playwright` · `Anthropic` (optional)

</div>

---

## ✨ What it does

Agent Smith is a QA platform for SaaS builders, indie devs and vibe coders
(Cursor, Claude Code, Lovable, Bolt, v0, Antigravity…). You point it at a
deployed web app and it runs an **autonomous audit**:

1. **Explore** — maps pages, links, buttons and forms
2. **Test** — buttons/forms, console errors, network failures, bad routes
3. **Analyse** — UI (responsive, contrast, alt), UX (clarity, hierarchy,
   empty states), security-light (headers, cookies, CSP, HTTPS — **passive
   only**), performance (load times, network health)
4. **Report** — overall + per-dimension scores, prioritised findings with
   evidence + reproduction + fix, screenshots, UX suggestions
5. **Fix prompt** — every finding compiled into one ready-to-paste prompt for
   your AI IDE

> The core value is the **actionable report + fix prompt** that lets you repair
> your SaaS in one pass inside Claude Code / Cursor.

## 🧠 The agent architecture

The engine turns a single crawl into an intermediate **`CrawlResult`** that every
agent analyses — so the **real Playwright engine** and the **mock engine** share
the exact same analysis pipeline.

| Agent | Responsibility |
|---|---|
| `ExplorerAgent` | Discovers pages, links, buttons, forms; reachability & broken links |
| `FunctionalQAAgent` | Buttons & forms, console errors, network errors, bad status codes |
| `UIAgent` | Responsive (viewport), contrast (WCAG), alt text, consistency |
| `UXAgent` | Clarity, friction, onboarding, empty states, visual hierarchy |
| `SecurityLightAgent` | **Passive** review of headers, cookies, CSP, HTTPS, tech leakage |
| `PerformanceAgent` | Load times, slow pages, failing/heavy network |
| `PromptFixAgent` | Synthesises the master fix prompt for Claude Code / Cursor |

**Hybrid engine** (`src/lib/audit/engine.ts`):

- Uses **real Playwright** when a browser is available (local dev) — it actually
  navigates, reads the DOM, captures console/network errors and headers.
- Falls back to a **deterministic mock crawl** automatically (e.g. on serverless,
  or if browsers aren't installed) so the product is always credible.
- Force it with `AUDIT_ENGINE=playwright` or `AUDIT_ENGINE=mock`.

## 🗂️ Project structure

```
src/
  app/
    page.tsx                     Landing (hero, how-it-works, features, agents, pricing, sample)
    login/ · signup/             Auth pages
    marketplace/                 Agent marketplace
    dashboard/                   Protected app (audits list, new audit, audit detail)
    api/
      auth/{signup,login,logout} Session auth
      audits/                    POST create · GET list
      audits/[id]/              GET · DELETE
      audits/[id]/run/          POST run the audit
      audits/[id]/export/       GET markdown export
  components/                    UI primitives + landing/dashboard/audit/marketplace components
  lib/
    audit/                       engine, mock, playwright-runner, report, screenshots, crawl-types
    agents/                      the 7 logical agents + registry + marketplace profiles
    ai/                          optional Anthropic narrative
    auth/                        password (bcrypt) + session (jose JWT cookie)
    db/                          Prisma client + audit data access
    security/                    credential masking helpers
  types/                         shared domain types
prisma/
  schema.prisma                  User · Audit · AuditFinding · AuditScreenshot · AgentProfile
  seed.ts                        demo user + agent profiles + demo audits
scripts/
  run-audit.ts                   standalone audit CLI
  prisma-provider.mjs            auto-selects sqlite/postgres from DATABASE_URL
  db-deploy.mjs                  pushes schema on Postgres targets (Vercel)
```

## 🚀 Local setup

> Requires **Node 18.18+** (Node 20 recommended).

```bash
npm install                # installs deps + generates Prisma client
npm run setup              # creates the SQLite DB + seeds demo data
npm run dev                # http://localhost:3000
```

**Demo account:** `demo@agentsmith.dev` / `demo1234`
(or click **“Continue with demo account”** on the login page).

### Run the engine from the CLI (no app/db needed)

```bash
# real browser crawl
npm run audit:cli -- https://example.com quick

# deterministic mock
AUDIT_ENGINE=mock npm run audit:cli -- https://your-app.app standard
```

For real browser audits locally, install the browser once:

```bash
npx playwright install chromium
```

## 🔑 Environment variables

See [`.env.example`](./.env.example). For local dev the defaults work out of the box.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | `file:./dev.db` locally; a Postgres URL in production |
| `AUTH_SECRET` | ✅ | Signs the session cookie — use a long random string in prod |
| `ANTHROPIC_API_KEY` | optional | If set, Claude writes the executive summary; otherwise a deterministic writer is used |
| `AUDIT_ENGINE` | optional | `playwright` or `mock` to force the engine (auto-detects if empty) |

## ▲ Deploy to Vercel

The schema provider is **auto-selected from `DATABASE_URL`** — no manual edits.

1. **Push to GitHub** (done — see the repo).
2. On Vercel, **Import** the GitHub repo.
3. Add a Postgres database (Vercel **Storage → Neon**, one click). It sets
   `DATABASE_URL` automatically.
4. Add env vars: `AUTH_SECRET` (required), `ANTHROPIC_API_KEY` (optional).
5. Deploy. The build runs `prisma generate` + pushes the schema to Postgres.
6. **Seed once** (optional, for the demo account) from your machine:
   ```bash
   DATABASE_URL="<your-prod-postgres-url>" npm run db:seed
   ```

> On serverless, the audit engine runs in **mock mode** by default (Playwright
> browsers aren't available there). Set `AUDIT_ENGINE=mock` explicitly, or run a
> dedicated worker / Vercel Sandbox for real browser audits (see *Known limits*).

## 🔒 Security & ethics

- You must **own or be authorized** to test the target — the UI requires an
  explicit confirmation checkbox.
- The security review is **passive and light only**: headers, cookies, CSP,
  HTTPS, tech leakage. **No brute force, no injection, no exploitation, no
  destructive scanning.**
- **Credentials are never stored in clear and never logged.** Only a
  `hasCredentials` boolean is persisted (see `src/lib/db/audits.ts` and
  `src/lib/security/mask.ts`). Passwords are hashed with bcrypt.

## ⚠️ Known limits (V1)

- **Real browser audits on Vercel** require a separate worker / sandbox; the
  serverless default is the mock engine.
- **Authenticated crawling** is scaffolded (credentials flow through the form and
  are masked) but the V1 crawl does not yet auto-login; it audits the public
  surface.
- **Screenshots** are annotated SVG representations of each page (instant,
  storable, serverless-safe). The Playwright runner can be extended to capture
  real PNGs.
- **Progress** on the audit detail page is a clean client-side simulation of the
  agent timeline while the run completes (no WebSocket required).
- **Stripe** is not wired — pricing components are ready but billing is not.

## 📦 Scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Provider select → generate → (push if PG) → build |
| `npm run setup` | generate + db push + seed |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Reset DB + reseed |
| `npm run audit:cli -- <url> [mode]` | Run the engine standalone |

---

<div align="center">
Built with Claude Code. Test only what you're allowed to test. 🕶️
</div>
