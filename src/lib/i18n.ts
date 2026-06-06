import { cookies, headers } from "next/headers";

export type Locale = "en" | "fr";
export const LOCALES: Locale[] = ["en", "fr"];
export const LOCALE_COOKIE = "lang";

/**
 * Server-side locale detection for the public site:
 *   1. `lang` cookie (manual override via the switcher) wins
 *   2. Vercel geo header — visitors from France → fr
 *   3. Accept-Language starting with "fr" → fr
 *   4. default → en
 */
export async function detectLocale(): Promise<Locale> {
  const c = await cookies();
  const cookieLang = c.get(LOCALE_COOKIE)?.value;
  if (cookieLang === "fr" || cookieLang === "en") return cookieLang;

  const h = await headers();
  const country = (h.get("x-vercel-ip-country") || "").toUpperCase();
  if (country === "FR") return "fr";

  const accept = (h.get("accept-language") || "").toLowerCase();
  if (/^fr\b|[,;\s]fr\b/.test(accept) || accept.startsWith("fr")) return "fr";

  return "en";
}

export interface Dict {
  nav: { how: string; features: string; agents: string; marketplace: string; pricing: string; signin: string; cta: string };
  hero: {
    badge: string; h1: string; h1accent: string; plain: string; support: string;
    placeholder: string; button: string; auditing: string; hint: string; orSample: string; works: string;
    previewLabel: string; simulated: string; teaserMore: string; teaserReady: string; viewFull: string; netErr: string; auditFail: string;
  };
  how: { eyebrow: string; title: string; sub: string; steps: { title: string; body: string }[] };
  features: { eyebrow: string; title: string; sub: string; agents: { name: string; body: string }[] };
  agentsTeaser: { eyebrow: string; title: string; sub: string; browse: string };
  sample: { eyebrow: string; title: string; sub: string; target: string; fixTitle: string; fixHint: string; findings: string[] };
  pricing: { eyebrow: string; title: string; sub: string };
  cta: { title: string; sub: string; button: string; rights: string; authorized: string };
}

const en: Dict = {
  nav: { how: "How it works", features: "Features", agents: "Agents", marketplace: "Marketplace", pricing: "Pricing", signin: "Sign in", cta: "Run your first audit" },
  hero: {
    badge: "Autonomous QA for vibe-coded apps",
    h1: "Your AI QA agent after every ", h1accent: "deploy",
    plain: "In plain terms: an agent tests your live app, finds what's broken, and hands you the fix — ready to paste into your editor.",
    support: "Paste a URL — agents explore the app, click every button, test forms and real user flows, then write a fix prompt ready for Claude Code, Cursor or any editor. Built for vibe-coded apps; works for any site.",
    placeholder: "https://your-app.vercel.app",
    button: "Audit for free", auditing: "Auditing…",
    hint: "No signup · instant preview · full report + fix prompt are free with an account",
    orSample: "or see a sample report →",
    works: "Works with Cursor · Claude Code · Lovable · Bolt · v0 · Antigravity",
    previewLabel: "Audit preview", simulated: "⚠️ Simulated preview (no real browser available) — the full audit uses a real browser.",
    teaserMore: "more findings", teaserReady: "Full report, screenshots and fix prompt ready to paste into Claude Code.",
    viewFull: "See the full report", netErr: "Network unavailable, try again.", auditFail: "Audit failed.",
  },
  how: {
    eyebrow: "How it works", title: "From URL to fix prompt in one pass",
    sub: "No setup, no scripts. Agent Smith treats every deploy like a release candidate.",
    steps: [
      { title: "Paste your URL", body: "Drop the link to your deployed app. Add optional login, IP/API-key whitelist notes and special instructions." },
      { title: "Agents go to work", body: "A swarm of QA agents explores pages, clicks buttons, tests forms and records every error, slow load and weak spot." },
      { title: "Get an actionable report", body: "Scores, prioritised findings, screenshots, UX suggestions — and a fix prompt ready to paste into Claude Code or Cursor." },
    ],
  },
  features: {
    eyebrow: "The agent swarm", title: "Seven specialised agents, one report",
    sub: "Each agent owns a dimension of quality. Together they cover what a human QA pass would — automatically.",
    agents: [
      { name: "ExplorerAgent", body: "Discovers pages, links, buttons and forms — maps your whole surface." },
      { name: "FunctionalQAAgent", body: "Tests buttons & forms, catches console + network errors and bad routes." },
      { name: "UXAgent", body: "Scores clarity, friction, onboarding, empty states and visual hierarchy." },
      { name: "UIAgent", body: "Checks responsive, contrast, alt text and design consistency." },
      { name: "SecurityLightAgent", body: "Passive review of headers, cookies, CSP & HTTPS. No aggressive scanning." },
      { name: "PerformanceAgent", body: "Measures load times, flags slow pages and failing network requests." },
      { name: "PromptFixAgent", body: "Turns every finding into one ready-to-paste fix prompt for your AI IDE." },
    ],
  },
  agentsTeaser: {
    eyebrow: "Agent marketplace", title: "Hire specialised agents on demand",
    sub: "Beyond the core, plug in named agents tuned for UX, security, mobile or conversion.",
    browse: "Browse the full marketplace →",
  },
  sample: {
    eyebrow: "Sample report", title: "The report you actually act on",
    sub: "Scores per dimension, prioritised findings, and a fix prompt engineered for your AI IDE.",
    target: "Target", fixTitle: "Fix prompt for Claude Code / Cursor",
    fixHint: "Paste straight into your AI IDE and let it fix the issues in one pass.",
    findings: ["Missing security headers (CSP, HSTS)", "Console errors on /dashboard", "/dashboard loads in 4.1s", "Low-contrast text on /pricing"],
  },
  pricing: { eyebrow: "Pricing", title: "Start free. Scale when it ships value.", sub: "No credit card to try. Cancel anytime." },
  cta: {
    title: "Ship it. Then let Agent Smith test it.",
    sub: "Your next deploy deserves a QA pass. Run your first audit in under a minute.",
    button: "Run your first audit",
    rights: "Test only sites you own or are authorized to test.",
    authorized: "",
  },
};

const fr: Dict = {
  nav: { how: "Comment ça marche", features: "Fonctionnalités", agents: "Agents", marketplace: "Marketplace", pricing: "Tarifs", signin: "Se connecter", cta: "Lancer mon premier audit" },
  hero: {
    badge: "QA autonome pour apps vibe-codées",
    h1: "Ton agent QA après chaque ", h1accent: "déploiement",
    plain: "En clair : un agent teste ton app en ligne, trouve ce qui ne va pas, et te donne le correctif — prêt à coller dans ton éditeur.",
    support: "Colle une URL — les agents explorent l'app, cliquent partout, testent les formulaires et les vrais parcours, puis écrivent un prompt correctif prêt pour Claude Code, Cursor ou n'importe quel éditeur. Conçu pour les apps vibe-codées ; marche pour n'importe quel site.",
    placeholder: "https://ton-app.vercel.app",
    button: "Auditer gratuitement", auditing: "Audit…",
    hint: "Sans inscription · aperçu instantané · le rapport complet + le prompt correctif sont gratuits avec un compte",
    orSample: "ou regarde un exemple de rapport →",
    works: "Compatible Cursor · Claude Code · Lovable · Bolt · v0 · Antigravity",
    previewLabel: "Aperçu de l'audit", simulated: "⚠️ Aperçu simulé (navigateur réel indisponible) — l'audit complet utilisera un vrai navigateur.",
    teaserMore: "autres findings", teaserReady: "Rapport complet, captures et prompt correctif prêts à coller dans Claude Code.",
    viewFull: "Voir le rapport complet", netErr: "Réseau indisponible, réessaie.", auditFail: "Échec de l'audit.",
  },
  how: {
    eyebrow: "Comment ça marche", title: "De l'URL au prompt correctif, en une passe",
    sub: "Aucune config, aucun script. Agent Smith traite chaque déploiement comme une version candidate.",
    steps: [
      { title: "Colle ton URL", body: "Donne le lien de ton app déployée. Ajoute en option un login, des notes de whitelist IP/clé API et des instructions spéciales." },
      { title: "Les agents bossent", body: "Une nuée d'agents QA explore les pages, clique sur les boutons, teste les formulaires et note chaque erreur, lenteur et point faible." },
      { title: "Reçois un rapport actionnable", body: "Scores, problèmes priorisés, captures, suggestions UX — et un prompt correctif prêt à coller dans Claude Code ou Cursor." },
    ],
  },
  features: {
    eyebrow: "La nuée d'agents", title: "Sept agents spécialisés, un seul rapport",
    sub: "Chaque agent possède une dimension de la qualité. Ensemble, ils couvrent ce qu'une passe QA humaine ferait — automatiquement.",
    agents: [
      { name: "ExplorerAgent", body: "Découvre pages, liens, boutons et formulaires — cartographie toute ta surface." },
      { name: "FunctionalQAAgent", body: "Teste boutons & formulaires, capte les erreurs console + réseau et les mauvaises routes." },
      { name: "UXAgent", body: "Note la clarté, la friction, l'onboarding, les états vides et la hiérarchie visuelle." },
      { name: "UIAgent", body: "Vérifie responsive, contraste, textes alt et cohérence du design." },
      { name: "SecurityLightAgent", body: "Revue passive des en-têtes, cookies, CSP & HTTPS. Aucun scan agressif." },
      { name: "PerformanceAgent", body: "Mesure les temps de chargement, signale les pages lentes et les requêtes en échec." },
      { name: "PromptFixAgent", body: "Transforme chaque problème en un prompt correctif prêt à coller dans ton IDE IA." },
    ],
  },
  agentsTeaser: {
    eyebrow: "Marketplace d'agents", title: "Recrute des agents spécialisés à la demande",
    sub: "Au-delà du socle, branche des agents nommés réglés pour l'UX, la sécurité, le mobile ou la conversion.",
    browse: "Parcourir toute la marketplace →",
  },
  sample: {
    eyebrow: "Exemple de rapport", title: "Le rapport sur lequel tu agis vraiment",
    sub: "Scores par dimension, problèmes priorisés, et un prompt correctif pensé pour ton IDE IA.",
    target: "Cible", fixTitle: "Prompt correctif pour Claude Code / Cursor",
    fixHint: "Colle directement dans ton IDE IA et laisse-le corriger en une passe.",
    findings: ["En-têtes de sécurité manquants (CSP, HSTS)", "Erreurs console sur /dashboard", "/dashboard charge en 4,1s", "Texte peu contrasté sur /pricing"],
  },
  pricing: { eyebrow: "Tarifs", title: "Commence gratuitement. Passe à l'échelle quand ça rapporte.", sub: "Pas de carte bancaire pour essayer. Annulable à tout moment." },
  cta: {
    title: "Déploie. Puis laisse Agent Smith le tester.",
    sub: "Ton prochain déploiement mérite une passe QA. Lance ton premier audit en moins d'une minute.",
    button: "Lancer mon premier audit",
    rights: "Teste uniquement des sites que tu possèdes ou que tu es autorisé à tester.",
    authorized: "",
  },
};

const DICTS: Record<Locale, Dict> = { en, fr };
export function getDictionary(locale: Locale): Dict {
  return DICTS[locale] ?? en;
}
