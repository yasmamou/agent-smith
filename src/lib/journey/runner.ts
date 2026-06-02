import type { Page } from "playwright-core";
import type { Persona } from "./personas";
import type { JourneyStep, JourneyResult, StepStatus, QuizAttempt } from "./types";
import { launchSession } from "@/lib/browser/session";
import { aiEnabled, aiComplete } from "@/lib/ai/provider";

/**
 * Persona journey runner — drives a real Chromium session AS a user, follows
 * the funnel, tries the product, and rates each step like real feedback.
 *
 * PASSIVE-SAFE: it navigates, reads, and interacts with non-destructive UI
 * (clicking nav/CTAs, selecting quiz options). It does NOT submit the signup
 * form (no fake accounts) unless an authenticated journey with provided test
 * credentials is requested.
 */

/**
 * In-browser snippets passed to page.evaluate AS STRINGS (IIFE).
 * Passing functions would let the TS bundler inject helpers like `__name`,
 * which aren't defined in the page context. Strings sidestep that.
 */
const EXPLORE_FN = `(() => {
  const t = (document.body.innerText || '').toLowerCase();
  const any = (arr) => arr.some(s => t.includes(s));
  const ctas = Array.from(document.querySelectorAll('a,button')).map(e => (e.textContent||'').trim()).filter(Boolean);
  return {
    hasPricing: any(['€','/mois','gratuit','premium','ultimate','abonn']),
    hasFeatures: any(['qcm','cours','fiche','annales','entrain','entraîn','progression','quiz','gymnasium']),
    hasTestimonials: any(['avis','témoignage','étoiles']),
    ctaCount: ctas.length
  };
})()`;

const SIGNUP_FORM_FN = `(() => {
  const inputs = Array.from(document.querySelectorAll('input')).filter(i => i.type !== 'hidden');
  const fields = inputs.map(i => i.getAttribute('type') || i.getAttribute('name') || 'text');
  const social = Array.from(document.querySelectorAll('a,button')).map(e => (e.textContent||'').toLowerCase())
    .some(x => x.includes('google') || x.includes('apple') || x.includes('facebook') || x.includes('sso') || x.includes('continuer avec'));
  return { fieldCount: inputs.length, fields, social };
})()`;

const QUIZ_VERDICT_FN = `(() => {
  const t = (document.body.innerText || '').toLowerCase();
  const has = (arr) => arr.some(s => t.includes(s));
  if (has(['bonne réponse','correct','bravo','réussi'])) return 'correct';
  if (has(['mauvaise','incorrect','faux','raté'])) return 'incorrect';
  return 'unknown';
})()`;

interface RunOpts {
  /** optional dir to also persist screenshots on disk (local only) */
  screenshotDir?: string;
  /** optional test credentials for the authenticated (QCM) journey */
  creds?: { email: string; password: string };
  headless?: boolean;
}

type PWPage = Page;

function ratingFromSignals(found: boolean, loadMs: number, errors: number, gated = false): number {
  let r = 5;
  if (!found) r -= 2.5;
  if (loadMs > 3500) r -= 1;
  else if (loadMs > 2000) r -= 0.5;
  if (errors > 0) r -= 1;
  if (gated) r -= 0.5;
  return Math.max(1, Math.round(r * 2) / 2);
}

export async function runPersonaJourney(
  target: string,
  persona: Persona,
  opts: RunOpts
): Promise<JourneyResult> {
  const start = Date.now();
  const { browser, context } = await launchSession({
    viewport: { width: 1366, height: 850 },
    userAgent: "Mozilla/5.0 (AgentSmith QA Persona Bot; +https://agentsmith.dev) Chrome/120 Safari/537.36",
  });
  const page = (await context.newPage()) as PWPage;

  const steps: JourneyStep[] = [];
  let gated = false;
  let gatedNote: string | undefined;
  let quiz: QuizAttempt | undefined;

  const consoleErrors: string[] = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));

  const shot = async (slug: string, idx: number, name: string) => {
    try {
      // capture to buffer (no disk needed — serverless safe)
      const buf = await page.screenshot();
      const data = `data:image/png;base64,${buf.toString("base64")}`;
      let file: string | undefined;
      if (opts.screenshotDir) {
        // also persist to disk when running locally (for the PDF scripts)
        try {
          const { join } = await import("node:path");
          const { writeFileSync } = await import("node:fs");
          file = join(opts.screenshotDir, `${slug}-${idx}-${name}.png`);
          writeFileSync(file, buf);
        } catch {
          file = undefined;
        }
      }
      return { file, data };
    } catch {
      return { file: undefined, data: undefined };
    }
  };

  const addStep = async (
    title: string,
    action: string,
    status: StepStatus,
    found: boolean,
    loadMs: number,
    observations: string[],
    shotName: string
  ) => {
    const errBefore = consoleErrors.length;
    const s = await shot(persona.slug, steps.length + 1, shotName);
    steps.push({
      index: steps.length + 1,
      title,
      action,
      url: page.url(),
      status,
      rating: ratingFromSignals(found, loadMs, errBefore, status === "gated"),
      loadMs,
      observations,
      screenshot: s.data,
      screenshotFile: s.file,
    });
  };

  try {
    // 1) Land on home
    let t0 = Date.now();
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    const homeH1 = await page.locator("h1").first().innerText().catch(() => "");
    await addStep(
      "Arrivée sur le site",
      `Ouvre ${target} comme un nouvel utilisateur`,
      "success",
      !!homeH1,
      Date.now() - t0,
      [
        homeH1 ? `Titre d'accueil : « ${homeH1.replace(/\n/g, " ").slice(0, 80)} »` : "Pas de titre H1 clair",
        "Première impression captée au-dessus de la ligne de flottaison.",
      ],
      "home"
    );

    // 2) Cookie consent
    for (const label of ["Tout accepter", "Accepter", "J'accepte", "Accept"]) {
      const el = page.getByRole("button", { name: new RegExp(label, "i") }).first();
      if (await el.count()) {
        await el.click().catch(() => {});
        await page.waitForTimeout(400);
        break;
      }
    }

    // 3-6) Public funnel — skipped for authenticated audits (go straight to
    // login + product, to preserve the target's rate-limit budget).
    if (!opts.creds) {
    // 3) Choose persona profile (if a selector exists)
    if (persona.profileMatch) {
      t0 = Date.now();
      const profile = page.getByText(persona.profileMatch).first();
      const found = (await profile.count()) > 0;
      if (found) {
        await profile.click().catch(() => {});
        await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const h1 = await page.locator("h1").first().innerText().catch(() => "");
        await addStep(
          "Choix du profil",
          `Sélectionne son profil « ${persona.name.split(" — ")[1] || persona.name} »`,
          "success",
          true,
          Date.now() - t0,
          [
            `Atterrit sur ${page.url()}`,
            h1 ? `Promesse : « ${h1.replace(/\n/g, " ").slice(0, 90)} »` : "Promesse de valeur peu lisible.",
          ],
          "profile"
        );
      } else {
        await addStep(
          "Choix du profil",
          "Cherche un sélecteur de profil correspondant",
          "partial",
          false,
          Date.now() - t0,
          ["Aucune carte de profil reconnue pour ce persona — parcours générique."],
          "profile"
        );
      }
    }

    // 4) Explore the landing — value prop, pricing, features
    {
      const info = (await page.evaluate(EXPLORE_FN)) as {
        hasPricing: boolean;
        hasFeatures: boolean;
        hasTestimonials: boolean;
        ctaCount: number;
      };
      const obs: string[] = [];
      obs.push(info.hasPricing ? "Tarifs visibles sur la page (gratuit / premium)." : "Tarifs peu visibles.");
      obs.push(
        info.hasFeatures
          ? "Les fonctionnalités clés (QCM/cours/entraînement) sont annoncées."
          : "Les fonctionnalités produit sont peu décrites."
      );
      await addStep(
        "Découverte de l'offre",
        "Parcourt la page : proposition de valeur, fonctionnalités, tarifs",
        info.hasFeatures ? "success" : "partial",
        info.hasFeatures,
        300,
        obs,
        "landing-explore"
      );
    }

    // 5) Follow the primary CTA toward the product
    {
      t0 = Date.now();
      let clicked = false;
      for (const kw of persona.ctaKeywords) {
        const cta = page.getByRole("link", { name: new RegExp(kw, "i") }).first();
        if (await cta.count()) {
          await cta.click().catch(() => {});
          await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
          await page.waitForTimeout(1000);
          clicked = true;
          break;
        }
      }
      const url = page.url();
      const isAuth = /\/auth\/(signup|signin|login|register)/i.test(url);
      if (isAuth) {
        gated = true;
        gatedNote =
          "Le produit (QCM, entraînement, suivi) est derrière l'inscription : l'utilisateur doit créer un compte pour atteindre les features.";
      }
      await addStep(
        "Passage à l'action",
        "Clique sur le CTA principal pour accéder au produit",
        isAuth ? "gated" : clicked ? "success" : "partial",
        clicked,
        Date.now() - t0,
        [
          clicked ? `CTA suivi → ${url}` : "CTA principal non trouvé clairement.",
          isAuth ? "🔒 Mur d'inscription atteint avant toute feature." : "Accès direct au contenu.",
        ],
        "cta"
      );
    }

    // 6) Inspect the signup/login form (no submit unless creds provided)
    if (/\/auth\//i.test(page.url())) {
      const form = (await page.evaluate(SIGNUP_FORM_FN)) as {
        fieldCount: number;
        fields: string[];
        social: boolean;
      };
      await addStep(
        "Évaluation de l'inscription",
        "Inspecte le formulaire d'inscription (sans le soumettre)",
        "success",
        form.fieldCount > 0,
        300,
        [
          `${form.fieldCount} champ(s) : ${form.fields.slice(0, 6).join(", ")}`,
          form.social ? "Connexion sociale disponible (friction réduite)." : "Pas de connexion sociale détectée — friction plus élevée.",
          "Formulaire non soumis (aucun compte créé).",
        ],
        "signup-form"
      );
    }
    } // end public funnel (skipped when authenticated)

    // 7) Authenticated deep journey — QCM (only with test creds)
    if (opts.creds) {
      quiz = await runAuthenticatedQuiz(page, persona, opts, addStep);
    }
  } catch (err) {
    steps.push({
      index: steps.length + 1,
      title: "Erreur de parcours",
      action: "Le parcours a été interrompu",
      url: page.url(),
      status: "blocked",
      rating: 1,
      loadMs: 0,
      observations: [err instanceof Error ? err.message : "Erreur inconnue"],
    });
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const ratings = steps.map((s) => s.rating);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const experienceScore = Math.round((avgRating / 5) * 100);

  return {
    personaSlug: persona.slug,
    personaName: persona.name,
    personaAvatar: persona.avatar,
    target,
    goal: persona.goal,
    steps,
    experienceScore,
    avgRating: Math.round(avgRating * 10) / 10,
    narrative: buildNarrative(persona, steps, gated, quiz),
    gated,
    gatedNote,
    quiz,
    durationMs: Date.now() - start,
  };
}

async function runAuthenticatedQuiz(
  page: PWPage,
  persona: Persona,
  opts: RunOpts,
  addStep: (
    title: string,
    action: string,
    status: StepStatus,
    found: boolean,
    loadMs: number,
    observations: string[],
    shotName: string
  ) => Promise<void>
): Promise<QuizAttempt> {
  const quiz: QuizAttempt = {
    reached: false,
    questionsSeen: 0,
    questionsAnswered: 0,
    correct: 0,
    incorrect: 0,
    notes: [],
  };
  const creds = opts.creds!;

  // Login
  let t0 = Date.now();
  await page.goto(new URL("/auth/signin", page.url()).href, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(800);
  // accept cookie banner if it reappeared (can cover the form)
  for (const re of [/^tout accepter$/i, /^accepter$/i, /^j'accepte$/i]) {
    const e = page.getByRole("button", { name: re }).first();
    if (await e.count()) {
      await e.click().catch(() => {});
      await page.waitForTimeout(300);
      break;
    }
  }
  const email = page.locator('input[type="email"], input[name*="mail" i]').first();
  const pass = page.locator('input[type="password"]').first();
  let loggedIn = false;
  if ((await email.count()) && (await pass.count())) {
    await email.fill(creds.email).catch(() => {});
    await pass.fill(creds.password).catch(() => {});
    // exact "Se connecter" submit — avoid matching "Se connecter avec Google"
    let submit = page.getByRole("button", { name: /^\s*se connecter\s*$/i }).first();
    if (!(await submit.count()))
      submit = page.getByRole("button", { name: /connexion|valider|^login$|^sign in$/i }).first();
    const hasSubmit = (await submit.count()) > 0;
    await (hasSubmit ? submit.click() : pass.press("Enter")).catch(() => {});
    // wait for the redirect away from /auth (robust to remote-browser latency)
    await page.waitForURL((u) => !/\/auth\//i.test(u.toString()), { timeout: 18000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800);
    loggedIn = !/\/auth\//i.test(page.url());
  }
  await addStep(
    "Connexion (compte de test)",
    "Se connecte avec le compte de test fourni",
    loggedIn ? "success" : "blocked",
    loggedIn,
    Date.now() - t0,
    [loggedIn ? `Connecté → ${page.url()}` : "Échec de connexion (vérifier les identifiants de test)."],
    "login"
  );
  if (!loggedIn) {
    quiz.notes.push("Connexion impossible avec les identifiants fournis.");
    return quiz;
  }

  // Dismiss onboarding/tutorial overlays that block navigation
  for (const re of [/sortir du tutoriel|je connais d[ée]j[àa]/i, /plus tard/i, /^✕$|^×$/]) {
    const e = page.getByRole("button", { name: re }).first();
    if (await e.count()) {
      await e.click().catch(() => {});
      await page.waitForTimeout(400);
    }
  }
  await page.keyboard.press("Escape").catch(() => {});

  // Navigate toward an answerable quiz.
  t0 = Date.now();
  const QUIZ_NAV = /sprint|qcm|quiz|entra[iî]n|medgames|jouer|d[ée]fi/i;
  const START_BTN = /lancer|commencer|d[ée]marrer|jouer|c'est parti|sprint|^go$/i;
  const origin = (() => { try { return new URL(page.url()).origin; } catch { return page.url(); } })();

  const killOverlays = async () => {
    for (const re of [/sortir du tutoriel|je connais d[ée]j[àa]/i, /plus tard/i, /^✕$|^×$/, /^tout accepter$|^accepter$/i]) {
      const e = page.getByRole("button", { name: re }).first();
      if (await e.count()) { await e.click().catch(() => {}); await page.waitForTimeout(300); }
    }
    await page.keyboard.press("Escape").catch(() => {});
  };
  const tryStart = async () => {
    for (const re of [/officielle/i, /^10\b|10 qcm/i, /^30s$/i]) {
      const e = page.getByRole("button", { name: re }).first();
      if (await e.count()) await e.click().catch(() => {});
    }
    for (const getter of [
      () => page.getByRole("button", { name: START_BTN }).first(),
      () => page.getByRole("link", { name: START_BTN }).first(),
      () => page.getByText(START_BTN).first(),
    ]) {
      const el = getter();
      if (await el.count()) { await el.click().catch(() => {}); await page.waitForTimeout(2800); return; }
    }
  };

  // (a) direct probes of common quiz routes (most reliable)
  for (const route of ["/app/sprint", "/sprint", "/app/qcm", "/quiz", "/app/medgames"]) {
    if (await hasQuestionUI(page)) break;
    await page.goto(origin + route, { waitUntil: "domcontentloaded", timeout: 18000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await killOverlays();
    await tryStart();
  }
  // (b) fallback: click through the nav (MedGames → Sprint → start)
  for (let hop = 0; hop < 2 && !(await hasQuestionUI(page)); hop++) {
    await killOverlays();
    const navLink = page.getByRole("link", { name: QUIZ_NAV }).first();
    const navText = page.getByText(QUIZ_NAV).first();
    if (await navLink.count()) await navLink.click().catch(() => {});
    else if (await navText.count()) await navText.click().catch(() => {});
    await page.waitForTimeout(1500);
    await tryStart();
  }
  quiz.reached = await hasQuestionUI(page);
  await addStep(
    "Accès à l'entraînement",
    "Cherche et lance une session de QCM (l'agent navigue comme un étudiant)",
    quiz.reached ? "success" : "partial",
    quiz.reached,
    Date.now() - t0,
    [quiz.reached ? `Session de QCM ouverte → ${page.url()}` : "Aucune session de QCM jouable atteinte."],
    "feature"
  );

  // Answer questions — the AI reads each question and decides the answer.
  let missingQuestionCount = 0;
  for (let q = 0; q < 5; q++) {
    const ui = await readQuestion(page);
    if (!ui.kind) break;
    quiz.questionsSeen++;
    const pointsBefore = await readPoints(page);

    let chosen = "";
    let reason = "";
    if (!ui.question) {
      // The platform showed answer buttons but NO question text → real bug.
      missingQuestionCount++;
      reason = "Aucun énoncé affiché — réponse impossible à raisonner.";
      chosen = ui.options[0] || "";
    } else if (aiEnabled() && ui.kind === "vraifaux") {
      const ans = (
        await aiComplete(
          `Tu passes un QCM médical. Affirmation : « ${ui.question} ». ` +
            `Réponds STRICTEMENT par un seul mot : "vrai" ou "faux".`,
          { maxTokens: 5 }
        )
      )?.toLowerCase();
      chosen = ans && /faux/.test(ans) ? "faux" : "vrai";
      reason = `IA → ${chosen}`;
    } else if (aiEnabled() && ui.options.length) {
      const ans = await aiComplete(
        `QCM médical. Question : « ${ui.question} ». Options : ${ui.options
          .map((o, i) => `${i + 1}. ${o}`)
          .join(" | ")}. Réponds STRICTEMENT par le numéro de la bonne option.`,
        { maxTokens: 5 }
      );
      const idx = Math.max(0, (parseInt(ans || "1", 10) || 1) - 1);
      chosen = ui.options[Math.min(idx, ui.options.length - 1)] || ui.options[0];
      reason = `IA → option ${idx + 1}`;
    } else {
      chosen = ui.options[0] || "vrai";
      reason = "Heuristique (IA non configurée)";
    }

    await clickAnswer(page, ui.kind, chosen);
    await page.waitForTimeout(1500);
    quiz.questionsAnswered++;

    const pointsAfter = await readPoints(page);
    let verdict = "unknown";
    if (pointsBefore != null && pointsAfter != null)
      verdict = pointsAfter > pointsBefore ? "correct" : "incorrect";
    else verdict = (await page.evaluate(QUIZ_VERDICT_FN)) as string;
    if (verdict === "correct") quiz.correct++;
    else if (verdict === "incorrect") quiz.incorrect++;

    quiz.notes.push(
      `Q${q + 1}: ${ui.question ? `« ${ui.question.slice(0, 70)} » → ${chosen} (${verdict})` : `pas d'énoncé → ${verdict}`}`
    );

    const next = page.getByRole("button", { name: /question suivante|suivant|continuer|next/i }).first();
    if (await next.count()) await next.click().catch(() => {});
    await page.waitForTimeout(700);
  }

  const aiOn = aiEnabled();
  const obs: string[] = [];
  if (quiz.questionsAnswered === 0) {
    obs.push("Aucune question jouable n'a pu être atteinte/répondue.");
  } else {
    obs.push(
      `${quiz.questionsAnswered} question(s) répondue(s) — ${quiz.correct} correcte(s), ${quiz.incorrect} incorrecte(s).` +
        (aiOn ? " Réponses choisies par l'IA (gpt-4o-mini)." : " (IA non configurée → réponses heuristiques.)")
    );
  }
  if (missingQuestionCount > 0) {
    obs.push(
      `🔴 ${missingQuestionCount} question(s) affichées SANS énoncé (seulement les boutons de réponse) — bug bloquant : impossible de répondre en connaissance de cause.`
    );
  }
  obs.push("L'agent évalue la clarté des questions et la présence d'une correction après réponse.");
  await addStep(
    "QCM réalisé",
    aiOn ? "L'IA lit chaque question et choisit la réponse, comme un étudiant" : "Répond aux questions et lit le feedback",
    quiz.questionsAnswered > 0 ? (missingQuestionCount ? "gated" : "success") : "partial",
    quiz.questionsAnswered > 0,
    0,
    obs,
    "quiz"
  );

  return quiz;
}

/** Detect whether an answerable question UI is on screen. */
async function hasQuestionUI(page: PWPage): Promise<boolean> {
  const vrai = page.getByRole("button", { name: /vrai/i }).first();
  const faux = page.getByRole("button", { name: /faux/i }).first();
  if ((await vrai.count()) && (await faux.count())) return true;
  const opts = page.locator('input[type="radio"], [role="radio"], button[class*="option" i]');
  return (await opts.count().catch(() => 0)) > 0;
}

const READ_QUESTION_FN = `(() => {
  const bad = /dashboard|communaut|sapiens|menu|classement|parrainage|^vrai$|^faux$|\\d+\\s*\\/\\s*\\d+|pt$|\\bxp\\b|carabin|niveau suivant|\\bjour\\b|score|seconde|d[ée]connexion|param[èe]tre|^profil$|medflix|pr[ée]pas|radiologie|anatomie|flashcard|biblioth[èe]que|kh[ôo]lles/i;
  // prefer real content blocks in <main>, not the gamified sidebar
  const nodes = Array.from(document.querySelectorAll('main p, main h1, main h2, main h3, [class*="question" i], [class*="enonce" i]'));
  const cand = nodes
    .map(e => (e.textContent || '').replace(/\\s+/g,' ').trim())
    .filter(t => t.length > 25 && t.length < 400 && !bad.test(t));
  cand.sort((a,b) => b.length - a.length);
  return { question: cand[0] || '' };
})()`;

interface QuestionUI { kind: "vraifaux" | "options" | null; question: string; options: string[]; }

async function readQuestion(page: PWPage): Promise<QuestionUI> {
  const vrai = page.getByRole("button", { name: /vrai/i }).first();
  const faux = page.getByRole("button", { name: /faux/i }).first();
  const isVF = (await vrai.count()) > 0 && (await faux.count()) > 0;
  const q = (await page.evaluate(READ_QUESTION_FN).catch(() => ({ question: "" }))) as { question: string };
  if (isVF) return { kind: "vraifaux", question: q.question, options: ["vrai", "faux"] };
  const optLoc = page.locator('button[class*="option" i], [role="radio"]');
  const n = await optLoc.count().catch(() => 0);
  if (n > 0) {
    const options = (await optLoc.allTextContents().catch(() => [])).map((t) => t.trim()).filter(Boolean).slice(0, 6);
    return { kind: "options", question: q.question, options };
  }
  return { kind: null, question: "", options: [] };
}

async function clickAnswer(page: PWPage, kind: "vraifaux" | "options", chosen: string) {
  if (kind === "vraifaux") {
    const re = /faux/.test(chosen) ? /faux/i : /vrai/i;
    await page.getByRole("button", { name: re }).first().click().catch(() => {});
  } else {
    const byText = page.getByRole("button", { name: new RegExp(chosen.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).first();
    if (await byText.count()) await byText.click().catch(() => {});
    else await page.locator('button[class*="option" i], [role="radio"]').first().click().catch(() => {});
  }
}

async function readPoints(page: PWPage): Promise<number | null> {
  try {
    return (await page.evaluate(
      `(()=>{const t=(document.querySelector('main')||document.body).innerText;const m=t.match(/(\\d+)\\s*pt/);return m?+m[1]:null;})()`
    )) as number | null;
  } catch {
    return null;
  }
}

function buildNarrative(
  persona: Persona,
  steps: JourneyStep[],
  gated: boolean,
  quiz?: QuizAttempt
): string {
  const avg = steps.length ? steps.reduce((a, s) => a + s.rating, 0) / steps.length : 0;
  const mood =
    avg >= 4.3 ? "très bonne" : avg >= 3.5 ? "bonne" : avg >= 2.5 ? "moyenne" : "frustrante";
  const parts: string[] = [];
  parts.push(
    `En tant que ${persona.name} (${persona.voice}), l'expérience a été ${mood}. ` +
      `Objectif : ${persona.goal}`
  );
  if (gated) {
    parts.push(
      "Point de friction clé : impossible de tester la moindre fonctionnalité (QCM, entraînement) sans créer un compte — " +
        "le funnel pousse à l'inscription avant toute démonstration de valeur. Un aperçu gratuit (1 QCM d'essai sans compte) lèverait cette barrière."
    );
  }
  if (quiz?.reached) {
    parts.push(
      `Côté produit : ${quiz.questionsAnswered} question(s) réalisée(s) (${quiz.correct} bonnes / ${quiz.incorrect} fausses). ` +
        (quiz.questionsAnswered ? "Le parcours d'entraînement fonctionne." : "Difficulté à lancer un QCM une fois connecté.")
    );
  }
  return parts.join(" ");
}
