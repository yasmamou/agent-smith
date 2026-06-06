# Self-hosted browser (no Browserbase)

Agent Smith needs a **real Chrome** to load sites, run JS, click, fill forms and
screenshot. Vercel's serverless runtime can't run Chrome reliably, so the engine
connects to a **remote Chrome over CDP**. That remote can be Browserbase — or
**your own**, which has no per-session quota.

The code is vendor-neutral: set `BROWSER_CDP_URL` to **any** CDP WebSocket
endpoint and the whole app uses it (audits, persona journeys, write-path, PDFs).
Priority order: `BROWSER_CDP_URL` → `BROWSERBASE_API_KEY` → local Playwright → mock.

---

## Fastest free option: run audits locally (no server at all)

If you just want real audits for yourself / Claude Code / CI, skip hosting and
run the engine on your machine — real Chromium, unlimited, free:

```bash
npm run audit:local -- https://your-app.com
npm run audit:local -- https://your-app.com --out report.json     # full JSON
LOGIN=a@b.c PASSWORD=secret npm run audit:local -- https://app.com authenticated --writes
```

It writes a consolidated fix prompt to `agent-smith-fix.md`. The hosted website
still needs a remote browser (below) for the "paste a URL" button to work online.

---

## Host your own Chrome (browserless) for the website

[`browserless`](https://github.com/browserless/browserless) is an open-source
headless-Chrome server. Deploy it once, point Agent Smith at it.

### 1. Deploy browserless

**Railway** (simplest):
1. New Project → Deploy a Docker image → `ghcr.io/browserless/chromium`
2. Add env var `TOKEN` = a long random string (your password).
3. Deploy → copy the public domain, e.g. `your-app.up.railway.app`.

**Fly.io**:
```bash
fly launch --image ghcr.io/browserless/chromium --no-deploy
fly secrets set TOKEN=your-long-random-token
fly deploy
```

(Any host that runs the Docker image works: Render, a VPS, etc.)

### 2. Build the CDP URL

```
wss://<your-host>?token=<your-token>
# e.g. wss://your-app.up.railway.app?token=abc123…
```

### 3. Point Agent Smith at it (Vercel)

```bash
vercel env add BROWSER_CDP_URL        # paste the wss URL  (Production)
vercel env add BROWSER_CONCURRENCY    # e.g. 3  (browserless handles more than Browserbase free)
# then redeploy
vercel --prod
```

That's it — the site now uses your Chrome. No Browserbase, no per-session quota.
Concurrency is bounded by `BROWSER_CONCURRENCY` (the DB semaphore) and by the
browserless instance's RAM (≈ 1 session per ~500 MB; bump the instance size to
run more in parallel).

### Notes
- Keep the `TOKEN` secret — anyone with the URL can drive your browser.
- browserless exposes `/metrics` and `/pressure` if you want to monitor load.
- To go back to Browserbase, clear `BROWSER_CDP_URL` and set the Browserbase vars.
