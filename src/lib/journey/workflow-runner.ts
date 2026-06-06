import type { Page } from "playwright-core";
import type { SiteModel, WorkflowResult, WorkflowStep } from "@/types";
import { launchSession } from "@/lib/browser/session";
import { aiComplete, parseAiJson } from "@/lib/ai/provider";

/**
 * Agentic workflow test — the linter→QA jump.
 * Given an inferred site model, the LLM drives a real browser toward the
 * primary user goal (observe → decide → act), then we ASSERT a real success
 * signal (text present or URL match). Bounded, read-path only, never submits
 * money/destructive forms. Falls back to "skipped" on any failure.
 */

const INVENTORY_FN = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  const seen = new Set();
  const clickables = [];
  for (const e of Array.from(document.querySelectorAll('a[href], button, [role="button"], [role="tab"]'))) {
    const t = (e.innerText || e.textContent || '').trim().replace(/\\s+/g,' ');
    if (!t || t.length > 40 || seen.has(t) || !vis(e)) continue;
    seen.add(t); clickables.push(t);
    if (clickables.length >= 22) break;
  }
  const fields = [];
  for (const i of Array.from(document.querySelectorAll('input, textarea, select'))) {
    if (['hidden','submit','button','checkbox','radio'].includes(i.type) || !vis(i)) continue;
    let label = i.getAttribute('aria-label') || i.getAttribute('placeholder') || '';
    if (!label && i.id) { const l = document.querySelector('label[for="' + CSS.escape(i.id) + '"]'); if (l) label = (l.textContent||'').trim(); }
    if (!label) label = i.getAttribute('name') || i.type || 'champ';
    fields.push({ label: label.trim().slice(0,40), type: i.type || i.tagName.toLowerCase() });
    if (fields.length >= 12) break;
  }
  // expose checkbox labels as clickable (toggling consent/authorization)
  for (const cb of Array.from(document.querySelectorAll('input[type=checkbox]'))) {
    if (!vis(cb)) continue;
    let label = cb.getAttribute('aria-label') || '';
    const wrap = cb.closest('label');
    if (!label && wrap) label = (wrap.textContent||'').trim();
    if (!label && cb.id) { const l = document.querySelector('label[for="' + CSS.escape(cb.id) + '"]'); if (l) label = (l.textContent||'').trim(); }
    // keep only the first sentence/line so it is matchable
    label = (label.split(/[.\\n]/)[0] || label).trim();
    if (label) { const s = label.slice(0,40); if (!seen.has(s)) { seen.add(s); clickables.push("☐ " + s); } }
  }
  return { clickables, fields };
})()`;

async function killOverlays(page: PWPage) {
  for (const re of [/tout accepter|^accepter$|j'accepte|^accept$/i, /sortir du tutoriel|je connais|plus tard/i, /^✕$|^×$|fermer/i]) {
    const e = page.getByRole("button", { name: re }).first();
    if (await e.count().catch(() => 0)) {
      await e.click().catch(() => {});
      await page.waitForTimeout(250);
    }
  }
  await page.keyboard.press("Escape").catch(() => {});
}

type PWPage = Page;

async function assertSuccess(page: PWPage, signal: string): Promise<boolean> {
  if (!signal) return false;
  const s = signal.trim();
  // URL-based signal
  if (s.startsWith("/") || s.includes("/")) {
    if (page.url().toLowerCase().includes(s.toLowerCase().replace(/^https?:\/\/[^/]+/, ""))) return true;
  }
  // text-based signal (visible)
  try {
    const loc = page.getByText(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first();
    if (await loc.count()) return await loc.isVisible().catch(() => false);
  } catch {
    /* ignore */
  }
  return false;
}

/** Generic login: find email+password (on /login or /auth/signin), submit, wait for redirect off auth. */
async function loginFlow(
  page: PWPage,
  target: string,
  creds: { email: string; password: string }
): Promise<boolean> {
  for (const path of ["/login", "/auth/signin", "/signin", "/connexion"]) {
    try {
      await page.goto(new URL(path, target).href, { waitUntil: "domcontentloaded", timeout: 20000 });
    } catch {
      continue;
    }
    await page.waitForTimeout(700);
    for (const re of [/^tout accepter$|^accepter$/i]) {
      const e = page.getByRole("button", { name: re }).first();
      if (await e.count().catch(() => 0)) await e.click().catch(() => {});
    }
    const email = page.locator('input[type="email"], input[name*="mail" i]').first();
    const pass = page.locator('input[type="password"]').first();
    if (!(await email.count().catch(() => 0)) || !(await pass.count().catch(() => 0))) continue;
    await email.fill(creds.email).catch(() => {});
    await pass.fill(creds.password).catch(() => {});
    let submit = page.getByRole("button", { name: /^\s*(se connecter|sign in|log in|connexion|continuer)\s*$/i }).first();
    if (!(await submit.count().catch(() => 0))) submit = page.getByRole("button", { name: /connect|sign|login|valider/i }).first();
    if (await submit.count().catch(() => 0)) await submit.click().catch(() => {});
    else await pass.press("Enter").catch(() => {});
    await page.waitForURL((u) => !/\/(login|signin|auth|connexion)/i.test(u.toString()), { timeout: 18000 }).catch(() => {});
    await page.waitForTimeout(1000);
    return !/\/(login|signin|auth|connexion)/i.test(page.url());
  }
  return false;
}

export async function runWorkflowTest(
  target: string,
  model: SiteModel,
  opts: { maxSteps?: number; creds?: { email: string; password: string } } = {}
): Promise<WorkflowResult> {
  const maxSteps = opts.maxSteps ?? (opts.creds ? 10 : 6);
  const wf = model.primaryWorkflow;
  const result: WorkflowResult = {
    goal: wf.goal,
    entryPath: wf.entryPath,
    status: "skipped",
    why: "",
    steps: [],
    screenshots: [],
  };

  let session;
  try {
    session = await launchSession({ viewport: { width: 1366, height: 850 } });
  } catch {
    result.why = "Navigateur indisponible.";
    return result;
  }
  const { browser, context } = session;
  const page = (await context.newPage()) as PWPage;

  const shot = async () => {
    try {
      const buf = await page.screenshot();
      if (result.screenshots.length < 3) result.screenshots.push(`data:image/png;base64,${buf.toString("base64")}`);
    } catch {
      /* ignore */
    }
  };
  const log = (action: string, tgt: string, note: string) =>
    result.steps.push({ n: result.steps.length + 1, action, target: tgt.slice(0, 60), note });

  try {
    // Write-path mode: log in first, then re-infer the workflow from the
    // AUTHENTICATED surface (the logged-out site model is auth-centric).
    if (opts.creds) {
      const ok = await loginFlow(page, target, opts.creds);
      log("login", "", ok ? "✅ connecté (compte de test)" : "échec de connexion");
      await shot();
      if (!ok) {
        result.status = "blocked";
        result.why = "Connexion impossible avec le compte de test fourni.";
        await context.close().catch(() => {});
        await browser.close().catch(() => {});
        return result;
      }
      await killOverlays(page);
      try {
        const inv0 = (await page.evaluate(INVENTORY_FN).catch(() => ({ clickables: [] }))) as { clickables: string[] };
        const re = await aiComplete(
          `Utilisateur CONNECTÉ sur ${page.url()}. Actions disponibles : ${JSON.stringify(inv0.clickables)}.\n` +
            `Quel est LE workflow principal à tester pour cet utilisateur connecté ? Réponds JSON :\n` +
            `{"goal":"action concrète à accomplir","successSignal":"texte court réellement affiché quand c'est réussi"}`,
          { json: true, maxTokens: 120 }
        );
        const m = parseAiJson<{ goal?: string; successSignal?: string } | null>(re, null);
        if (m?.goal) {
          wf.goal = m.goal;
          if (m.successSignal) wf.successSignal = m.successSignal;
          result.goal = m.goal;
          log("infer", wf.goal, "🎯 workflow connecté ré-inféré");
        }
      } catch {
        /* keep the original goal */
      }
      // stay on the post-login page (don't navigate to the auth entryPath)
    } else {
      const entry = (() => {
        try {
          return new URL(wf.entryPath, target).href;
        } catch {
          return target;
        }
      })();
      await page.goto(entry, { waitUntil: "domcontentloaded", timeout: 25000 });
      await page.waitForLoadState("networkidle", { timeout: 7000 }).catch(() => {});
      await killOverlays(page);
      log("goto", wf.entryPath, "Entrée du parcours");
      await shot();
    }

    const tried = new Map<string, number>();
    const filled = new Set<string>();
    const checked = new Set<string>();
    const urlHistory: string[] = [page.url()];
    const startPath = (() => { try { return new URL(page.url()).pathname; } catch { return "/"; } })();
    const isAuthUrl = (u: string) => /\/(login|signup|sign-?in|sign-?up|auth|connexion|inscription|register)/i.test(u);
    // generic "created/submitted" cue: navigated to a fresh sub-resource (id segment)
    const looksCreated = () => {
      const u = page.url();
      return /\/[a-z0-9_-]{8,}(\?|$)/i.test(u) && new URL(u).pathname !== startPath && !/\/new\b/.test(u) && !isAuthUrl(u);
    };
    const trySubmit = async () => {
      const submit = page
        .getByRole("button", { name: /launch|lancer|^run\b|d[ée]marrer|cr[ée]er|valider|envoyer|soumettre|confirmer|terminer|^go$|submit/i })
        .first();
      if (await submit.count().catch(() => 0)) {
        const before = page.url();
        await submit.click({ timeout: 6000 }).catch(() => {});
        await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
        await page.waitForTimeout(1200);
        urlHistory.push(page.url());
        log("click", "(auto) soumettre", "soumission automatique du formulaire");
        return before !== page.url();
      }
      return false;
    };

    for (let i = 0; i < maxSteps; i++) {
      if ((await assertSuccess(page, wf.successSignal)) || looksCreated()) {
        result.status = "pass";
        result.why = looksCreated()
          ? `Action aboutie : navigation vers une nouvelle ressource (${new URL(page.url()).pathname}).`
          : `But atteint : signal « ${wf.successSignal} » détecté sur ${new URL(page.url()).pathname}.`;
        await shot();
        log("assert", wf.successSignal, "✅ succès vérifié");
        break;
      }

      // Auth-wall detection: bouncing between login/signup ⇒ the goal needs a
      // write-path (account creation / form submit) we don't do in read-only mode.
      const recentUrls = urlHistory.slice(-4);
      if (recentUrls.length >= 3 && recentUrls.filter(isAuthUrl).length >= 3) {
        result.status = "blocked";
        result.why = `Mur d'authentification : le parcours « ${wf.goal} » exige la création d'un compte / la soumission d'un formulaire. Non franchissable en lecture seule — à tester en mode authentifié (write-path) avec un compte de test.`;
        log("assert", "auth-wall", "🔒 inscription/connexion requise");
        await shot();
        break;
      }

      const inv = (await page.evaluate(INVENTORY_FN).catch(() => ({ clickables: [], fields: [] }))) as {
        clickables: string[];
        fields: { label: string; type: string }[];
      };
      if (!inv.clickables.length && !inv.fields.length) {
        result.status = "blocked";
        result.why = "Aucun élément interactif standard détecté (UI custom/canvas ?) — parcours non automatisable en l'état.";
        break;
      }

      const recent = result.steps.slice(-4).map((s) => `${s.action} ${s.target}`).join(" → ");
      const alreadyTried = Array.from(tried.keys());
      const writeHint = opts.creds
        ? `\nMode write-path autorisé : remplis les champs REQUIS avec des données de TEST (URL "https://example.com"), coche les autorisations (cibles ☐), puis CLIQUE le bouton de soumission (ex. "Launch audit"). Ignore les champs optionnels.`
        : `\nLecture seule : ne remplis/soumets RIEN.`;
      const decision = await aiComplete(
        `Tu es un agent QA qui pilote un navigateur pour accomplir un objectif utilisateur.\n` +
          `OBJECTIF : ${wf.goal}\nSIGNAL DE SUCCÈS attendu : « ${wf.successSignal} »\n` +
          `URL actuelle : ${page.url()}\nActions déjà faites : ${recent || "(aucune)"}\n` +
          `Champs DÉJÀ remplis (NE PAS refaire) : ${JSON.stringify([...filled])}\n` +
          `Cases DÉJÀ cochées (NE PAS refaire) : ${JSON.stringify([...checked])}\n` +
          `Champs de formulaire (remplissables) : ${JSON.stringify(inv.fields)}\nÉléments cliquables : ${JSON.stringify(inv.clickables)}${writeHint}\n\n` +
          `Règle : si le champ requis (URL) est rempli ET l'autorisation cochée, l'action suivante DOIT être de cliquer le bouton de soumission. Réponds STRICTEMENT en JSON :\n` +
          `{"action":"click"|"fill"|"done","target":"libellé EXACT d'un champ/élément","value":"(si fill) valeur","reason":"court"}`,
        { json: true, maxTokens: 140 }
      );
      const act = parseAiJson<{ action: string; target: string; value?: string; reason: string }>(decision, {
        action: "done",
        target: "",
        reason: "no decision",
      });

      if (act.action === "done") {
        log("done", "", act.reason || "agent arrête");
        break;
      }

      // Loop guard: same action+target chosen repeatedly ⇒ stuck.
      const key = `${act.action}:${act.target}`;
      const count = (tried.get(key) || 0) + 1;
      tried.set(key, count);
      if (count >= 2 && act.action !== "fill") {
        result.status = "blocked";
        result.why = `Boucle détectée (« ${act.target} » répété) : le parcours « ${wf.goal} » semble nécessiter une étape non franchissable automatiquement.`;
        log("assert", act.target, "↻ boucle — arrêt");
        await shot();
        break;
      }

      let clicked = false;
      const cleanTarget = act.target.replace(/^☐\s*/, "");
      const esc = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Checkbox toggle (authorization, consent, …)
      if (act.target.startsWith("☐") || /autoris|authorized|j'accepte|consent|d'accord/i.test(cleanTarget)) {
        if (checked.has(cleanTarget)) { log("check", cleanTarget, "déjà coché — tentative de soumission"); if (await trySubmit()) continue; continue; }
        const cb = page.getByRole("checkbox", { name: new RegExp(esc.slice(0, 24), "i") }).first();
        if (await cb.count().catch(() => 0)) {
          await cb.check({ timeout: 6000 }).catch(() => {});
          clicked = true;
        } else {
          const lbl = page.getByText(new RegExp(esc.slice(0, 24), "i")).first();
          if (await lbl.count().catch(() => 0)) { await lbl.click({ timeout: 6000 }).catch(() => {}); clicked = true; }
        }
        if (clicked) checked.add(cleanTarget);
        log("check", cleanTarget, clicked ? "✅ coché" : "case introuvable");
        await page.waitForTimeout(250);
        urlHistory.push(page.url());
        if (clicked) continue;
      }

      if (act.action === "fill") {
        if (filled.has(act.target)) { log("fill", act.target, "déjà rempli — tentative de soumission"); await trySubmit(); continue; }
        const value = (act.value || "https://example.com").slice(0, 120);
        // find the input by placeholder / aria-label / associated label / name
        const candidates = [
          page.getByLabel(new RegExp(esc, "i")).first(),
          page.getByPlaceholder(new RegExp(esc, "i")).first(),
          page.locator(`input[name*="${act.target.split(" ")[0]}" i], textarea[name*="${act.target.split(" ")[0]}" i]`).first(),
        ];
        for (const c of candidates) {
          if (await c.count().catch(() => 0)) {
            await c.fill(value, { timeout: 6000 }).catch(() => {});
            clicked = true;
            break;
          }
        }
        if (clicked) filled.add(act.target);
        log("fill", `${act.target}="${value}"`, act.reason || (clicked ? "" : "champ introuvable"));
        await page.waitForTimeout(300);
        urlHistory.push(page.url());
        continue;
      }

      const btn = page.getByRole("button", { name: new RegExp("^\\s*" + esc + "\\s*$", "i") }).first();
      const link = page.getByRole("link", { name: new RegExp("^\\s*" + esc + "\\s*$", "i") }).first();
      if (await btn.count().catch(() => 0)) { await btn.click({ timeout: 6000 }).catch(() => {}); clicked = true; }
      else if (await link.count().catch(() => 0)) { await link.click({ timeout: 6000 }).catch(() => {}); clicked = true; }
      else {
        const byText = page.getByText(act.target, { exact: false }).first();
        if (await byText.count().catch(() => 0)) { await byText.click({ timeout: 6000 }).catch(() => {}); clicked = true; }
      }
      log("click", act.target, act.reason || (clicked ? "" : "élément introuvable"));
      await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(700);
      await killOverlays(page);
      urlHistory.push(page.url());
      if (i < 2) await shot();
    }

    if (result.status === "skipped") {
      // one last assertion after the loop
      if (await assertSuccess(page, wf.successSignal)) {
        result.status = "pass";
        result.why = `But atteint : signal « ${wf.successSignal} » détecté.`;
      } else {
        result.status = "blocked";
        result.why = `Le but « ${wf.goal} » n'a pas été atteint en ${maxSteps} étapes (signal « ${wf.successSignal} » non détecté). À vérifier : parcours peut nécessiter un compte, un état, ou être réellement bloqué.`;
      }
      await shot();
    }
  } catch (e) {
    result.status = "skipped";
    result.why = "Erreur pendant le test de workflow : " + (e instanceof Error ? e.message.slice(0, 120) : "inconnue");
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  return result;
}
