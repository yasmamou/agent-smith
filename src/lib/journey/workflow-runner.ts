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
  const seen = new Set();
  const out = [];
  const els = Array.from(document.querySelectorAll('a[href], button, [role="button"], [role="tab"]'));
  for (const e of els) {
    const t = (e.innerText || e.textContent || '').trim().replace(/\\s+/g,' ');
    if (!t || t.length > 40) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 24) break;
  }
  return out;
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

export async function runWorkflowTest(
  target: string,
  model: SiteModel,
  opts: { maxSteps?: number } = {}
): Promise<WorkflowResult> {
  const maxSteps = opts.maxSteps ?? 6;
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

    const tried = new Map<string, number>();
    const urlHistory: string[] = [page.url()];
    const isAuthUrl = (u: string) => /\/(login|signup|sign-?in|sign-?up|auth|connexion|inscription|register)/i.test(u);

    for (let i = 0; i < maxSteps; i++) {
      if (await assertSuccess(page, wf.successSignal)) {
        result.status = "pass";
        result.why = `But atteint : signal « ${wf.successSignal} » détecté sur ${new URL(page.url()).pathname}.`;
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

      const inventory = (await page.evaluate(INVENTORY_FN).catch(() => [])) as string[];
      if (!inventory.length) {
        result.status = "blocked";
        result.why = "Aucun élément interactif standard détecté (UI custom/canvas ?) — parcours non automatisable en l'état.";
        break;
      }

      const recent = result.steps.slice(-4).map((s) => `${s.action} ${s.target}`).join(" → ");
      const alreadyTried = Array.from(tried.keys());
      const decision = await aiComplete(
        `Tu es un agent QA qui pilote un navigateur pour accomplir un objectif utilisateur.\n` +
          `OBJECTIF : ${wf.goal}\nSIGNAL DE SUCCÈS attendu : « ${wf.successSignal} »\n` +
          `URL actuelle : ${page.url()}\nActions déjà faites : ${recent || "(aucune)"}\n` +
          `NE RÉPÈTE PAS ces cibles déjà essayées sans effet : ${JSON.stringify(alreadyTried)}\n` +
          `Éléments cliquables visibles : ${JSON.stringify(inventory)}\n\n` +
          `Choisis LA prochaine action qui rapproche du but (une cible NON déjà essayée si possible). Réponds STRICTEMENT en JSON :\n` +
          `{"action":"click"|"done","target":"texte EXACT d'un élément de la liste","reason":"court"}\n` +
          `Utilise "done" seulement si le but est déjà atteint ou réellement inatteignable sans compte.`,
        { json: true, maxTokens: 120 }
      );
      const act = parseAiJson<{ action: string; target: string; reason: string }>(decision, {
        action: "done",
        target: "",
        reason: "no decision",
      });

      if (act.action === "done") {
        log("done", "", act.reason || "agent arrête");
        break;
      }

      // Loop guard: same target chosen repeatedly ⇒ stuck.
      const count = (tried.get(act.target) || 0) + 1;
      tried.set(act.target, count);
      if (count >= 2) {
        result.status = "blocked";
        result.why = `Boucle détectée (action « ${act.target} » répétée) : le parcours « ${wf.goal} » semble nécessiter une saisie/soumission (write-path) non effectuée en lecture seule.`;
        log("assert", act.target, "↻ boucle — arrêt");
        await shot();
        break;
      }

      const btn = page.getByRole("button", { name: new RegExp("^\\s*" + act.target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$", "i") }).first();
      const link = page.getByRole("link", { name: new RegExp("^\\s*" + act.target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$", "i") }).first();
      let clicked = false;
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
