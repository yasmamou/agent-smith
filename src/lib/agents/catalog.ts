import type { Category, Severity } from "@/types";

/**
 * Catalogue of test "checks" — the building blocks a user picks when creating a
 * custom agent in the marketplace. Each check belongs to a category and is
 * either passive (safe, default) or active (sends probes — authorization
 * required, non-destructive payloads only).
 */
export type CheckType = "passive" | "active";

export interface CheckDef {
  id: string;
  label: string;
  category: Category;
  type: CheckType;
  severityHint: Severity;
  specialties: string[];
  description: string;
}

export interface Specialty {
  key: string;
  label: string;
  avatar: string;
  accent: string;
  blurb: string;
}

export const SPECIALTIES: Specialty[] = [
  { key: "cybersecurity", label: "Cybersécurité", avatar: "🛡️", accent: "#3dc5ff", blurb: "Sécurité passive + sondes actives autorisées" },
  { key: "functional", label: "Fonctionnel / QA", avatar: "🧪", accent: "#18e26a", blurb: "Boutons, formulaires, erreurs, routes" },
  { key: "ux", label: "UX / Conversion", avatar: "🧭", accent: "#4dff95", blurb: "Clarté, friction, onboarding, funnel" },
  { key: "performance", label: "Performance", avatar: "⚡", accent: "#ffd23d", blurb: "Temps de chargement, réseau" },
  { key: "accessibility", label: "Accessibilité", avatar: "♿", accent: "#ff8a3d", blurb: "Contraste, alt, hiérarchie" },
];

export const CHECKS: CheckDef[] = [
  // Functional
  { id: "console-errors", label: "Erreurs console JS", category: "functional", type: "passive", severityHint: "high", specialties: ["functional"], description: "Détecte les erreurs JavaScript dans la console." },
  { id: "network-errors", label: "Requêtes réseau en échec", category: "functional", type: "passive", severityHint: "high", specialties: ["functional"], description: "Repère les requêtes 4xx/5xx et échecs réseau." },
  { id: "broken-links", label: "Liens internes cassés", category: "functional", type: "passive", severityHint: "medium", specialties: ["functional"], description: "Liens de navigation vers des pages manquantes." },
  { id: "form-labels", label: "Champs sans label", category: "functional", type: "passive", severityHint: "medium", specialties: ["functional", "accessibility"], description: "Inputs sans label associé." },
  { id: "bad-status", label: "Routes en erreur", category: "functional", type: "passive", severityHint: "critical", specialties: ["functional"], description: "Routes liées renvoyant 4xx/5xx." },
  // UI
  { id: "viewport-meta", label: "Meta viewport (responsive)", category: "ui", type: "passive", severityHint: "high", specialties: ["accessibility", "ux"], description: "Présence du meta viewport pour le mobile." },
  { id: "contrast", label: "Contraste WCAG", category: "ui", type: "passive", severityHint: "medium", specialties: ["accessibility"], description: "Texte à faible contraste (< 4.5:1)." },
  { id: "img-alt", label: "Images sans alt", category: "ui", type: "passive", severityHint: "low", specialties: ["accessibility"], description: "Images sans attribut alt." },
  // UX
  { id: "heading-hierarchy", label: "Hiérarchie des titres", category: "ux", type: "passive", severityHint: "low", specialties: ["ux"], description: "Présence/unicité du H1." },
  { id: "empty-states", label: "États vides", category: "ux", type: "passive", severityHint: "low", specialties: ["ux"], description: "Pages vides sans guidage." },
  { id: "first-run", label: "Guidage nouvel utilisateur", category: "ux", type: "passive", severityHint: "low", specialties: ["ux"], description: "CTA principal clair pour un nouvel arrivant." },
  // Security — passive
  { id: "https", label: "HTTPS forcé", category: "security", type: "passive", severityHint: "critical", specialties: ["cybersecurity"], description: "Le site est servi en HTTPS." },
  { id: "security-headers", label: "En-têtes de sécurité", category: "security", type: "passive", severityHint: "high", specialties: ["cybersecurity"], description: "CSP, HSTS, X-Frame-Options, etc." },
  { id: "insecure-cookies", label: "Cookies non sécurisés", category: "security", type: "passive", severityHint: "medium", specialties: ["cybersecurity"], description: "Secure / HttpOnly / SameSite." },
  { id: "tech-leak", label: "Fuite de stack technique", category: "security", type: "passive", severityHint: "low", specialties: ["cybersecurity"], description: "Server / X-Powered-By exposés." },
  // Security — ACTIVE (authorization required, non-destructive)
  { id: "sql-injection", label: "Injection SQL (sonde)", category: "security", type: "active", severityHint: "critical", specialties: ["cybersecurity"], description: "Sonde non destructive : détecte des signatures d'erreur SQL sur les paramètres d'URL. Autorisation requise." },
  { id: "xss-reflected", label: "XSS réfléchi (sonde)", category: "security", type: "active", severityHint: "high", specialties: ["cybersecurity"], description: "Sonde non destructive : marqueur inoffensif réfléchi sans échappement. Autorisation requise." },
  // Performance
  { id: "slow-pages", label: "Pages lentes", category: "performance", type: "passive", severityHint: "medium", specialties: ["performance"], description: "Chargements > 2.5s / 4.5s." },
];

export function getCheck(id: string) {
  return CHECKS.find((c) => c.id === id);
}

export function defaultChecksFor(specialty: string): string[] {
  return CHECKS.filter((c) => c.specialties.includes(specialty)).map((c) => c.id);
}

/** Categories covered by a set of check ids (for filtering technical findings). */
export function categoriesForChecks(ids: string[]): Set<Category> {
  const cats = new Set<Category>();
  for (const id of ids) {
    const c = getCheck(id);
    if (c) cats.add(c.category);
  }
  return cats;
}

export function activeChecks(ids: string[]): CheckDef[] {
  return ids.map(getCheck).filter((c): c is CheckDef => !!c && c.type === "active");
}
