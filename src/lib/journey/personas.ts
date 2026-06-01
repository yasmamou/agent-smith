/**
 * User personas — Agent Smith drives the browser AS these users, follows the
 * journey, tries features and rates the experience like real feedback.
 *
 * Personas are generic (keyword-driven) so the journey runner works on any
 * site; the defaults below are tuned for an education/SaaS funnel.
 */
export interface Persona {
  slug: string;
  name: string;
  avatar: string;
  /** one-line who they are */
  bio: string;
  /** what success looks like for this user */
  goal: string;
  /** regex to recognise this persona's entry/profile choice on a selector */
  profileMatch?: RegExp;
  /** keywords (lowercased) for the primary "start / sign up" CTA */
  ctaKeywords: string[];
  /** keywords for the product feature this user wants to reach (e.g. quizzes) */
  featureKeywords: string[];
  /** tone of the qualitative feedback */
  voice: string;
}

export const PERSONAS: Persona[] = [
  {
    slug: "lyceen",
    name: "Léa — Lycéenne (PASS/LAS)",
    avatar: "🎓",
    bio: "Terminale, vise médecine, découvre la plateforme pour la première fois.",
    goal: "Comprendre si ça l'aide à réussir l'accès en médecine et commencer un entraînement.",
    profileMatch: /lyc[ée]en|pass|las/i,
    ctaKeywords: ["commencer gratuitement", "créer mon compte", "commencer", "s'inscrire", "essayer"],
    featureKeywords: ["qcm", "quiz", "entra[îi]n", "s'entra[îi]ner", "cours", "exercice", "gymnasium"],
    voice: "anxieuse mais motivée, peu de temps, veut du concret tout de suite",
  },
  {
    slug: "externe",
    name: "Karim — Externe (EDN/DFASM)",
    avatar: "🩺",
    bio: "Étudiant en 5e année, prépare l'EDN, compare les outils de QCM.",
    goal: "Évaluer la qualité/quantité des QCM EDN et la pertinence du suivi de progression.",
    profileMatch: /externe|edn|dfasm/i,
    ctaKeywords: ["commencer gratuitement", "créer mon compte", "commencer", "s'inscrire"],
    featureKeywords: ["qcm", "edn", "dossier", "annales", "entra[îi]n", "progression", "statistiques"],
    voice: "exigeant, pressé, compare au concurrent, juge la densité de contenu",
  },
  {
    slug: "interne",
    name: "Inès — Interne / jeune médecin",
    avatar: "👩‍⚕️",
    bio: "Interne, cherche de la révision rapide et fiable entre deux gardes.",
    goal: "Vérifier si le contenu est à son niveau et utilisable en sessions courtes.",
    profileMatch: /interne|m[ée]decin/i,
    ctaKeywords: ["commencer gratuitement", "créer mon compte", "commencer", "s'inscrire"],
    featureKeywords: ["qcm", "r[ée]vision", "fiche", "cas", "entra[îi]n"],
    voice: "très peu de temps, va droit au but, sensible à l'ergonomie mobile",
  },
];

export function getPersona(slug: string) {
  return PERSONAS.find((p) => p.slug === slug);
}
