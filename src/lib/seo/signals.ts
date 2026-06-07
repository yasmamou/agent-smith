/**
 * Gather REAL on-page + technical SEO/GEO signals for a URL, to ground the SEO
 * advisor (Agent Link) in facts rather than guesses. Best-effort, SSRF-guarded,
 * resilient (any fetch can fail without sinking the analysis).
 *
 * Covers classic SEO (title, meta, canonical, headings, OG/Twitter, robots,
 * sitemap) AND GEO/AEO signals (structured data JSON-LD, llms.txt) — the latter
 * is what makes a site citable by LLM answer engines.
 */
export interface SeoSignals {
  title?: string;
  titleLen?: number;
  metaDescription?: string;
  metaDescriptionLen?: number;
  canonical?: string;
  robotsMeta?: string;
  htmlLang?: string;
  h1Count?: number;
  ogTags: string[];
  twitterCard?: string;
  jsonLdTypes: string[]; // schema.org @type values found
  hreflang: string[];
  hasRobotsTxt?: boolean;
  hasSitemap?: boolean;
  hasLlmsTxt?: boolean; // GEO/AEO: llms.txt for LLM answer engines
  wordCount?: number;
}

const UA = "Mozilla/5.0 (AgentSmith SEO Bot; +https://agentsmith.dev)";

async function safeFetch(url: string, timeoutMs = 9000): Promise<Response | null> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, redirect: "follow" });
    clearTimeout(to);
    return res;
  } catch {
    return null;
  }
}

function attr(html: string, re: RegExp): string | undefined {
  const m = html.match(re);
  return m ? m[1].trim() : undefined;
}

export async function gatherSeoSignals(targetUrl: string): Promise<SeoSignals> {
  const sig: SeoSignals = { ogTags: [], jsonLdTypes: [], hreflang: [] };

  try {
    const { assertPublicHttpUrl } = await import("@/lib/security/ssrf");
    await assertPublicHttpUrl(targetUrl);
  } catch {
    return sig;
  }

  const origin = (() => { try { return new URL(targetUrl).origin; } catch { return targetUrl; } })();

  const res = await safeFetch(targetUrl);
  if (res && res.ok) {
    const html = (await res.text().catch(() => "")).slice(0, 400_000);

    sig.title = attr(html, /<title[^>]*>([^<]*)<\/title>/i);
    sig.titleLen = sig.title?.length;
    sig.metaDescription = attr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
    sig.metaDescriptionLen = sig.metaDescription?.length;
    sig.canonical = attr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
    sig.robotsMeta = attr(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i);
    sig.htmlLang = attr(html, /<html[^>]+lang=["']([^"']*)["']/i);
    sig.h1Count = (html.match(/<h1[\s>]/gi) || []).length;
    sig.twitterCard = attr(html, /<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']*)["']/i);

    // Open Graph tags present
    const og = new Set<string>();
    for (const m of html.matchAll(/<meta[^>]+property=["'](og:[a-z]+)["']/gi)) og.add(m[1].toLowerCase());
    sig.ogTags = [...og];

    // hreflang alternates
    const hl = new Set<string>();
    for (const m of html.matchAll(/<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["']/gi)) hl.add(m[1].toLowerCase());
    sig.hreflang = [...hl];

    // JSON-LD structured data @types (GEO/AEO signal)
    const types = new Set<string>();
    for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      for (const t of m[1].matchAll(/"@type"\s*:\s*"([^"]+)"/g)) types.add(t[1]);
    }
    sig.jsonLdTypes = [...types];

    // rough word count of visible text
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
    sig.wordCount = (text.match(/\S+/g) || []).length;
  }

  // technical files (HEAD-ish via GET, just check status)
  const [robots, sitemap, llms] = await Promise.all([
    safeFetch(`${origin}/robots.txt`, 5000),
    safeFetch(`${origin}/sitemap.xml`, 5000),
    safeFetch(`${origin}/llms.txt`, 5000),
  ]);
  sig.hasRobotsTxt = !!(robots && robots.ok);
  sig.hasSitemap = !!(sitemap && sitemap.ok);
  sig.hasLlmsTxt = !!(llms && llms.ok);

  return sig;
}

/** Compact human/LLM-readable summary for the advisor prompt. */
export function summarizeSeo(s: SeoSignals): string {
  return [
    `title: ${s.title ? `"${s.title}" (${s.titleLen} car.)` : "ABSENT"}`,
    `meta description: ${s.metaDescription ? `"${s.metaDescription.slice(0, 160)}" (${s.metaDescriptionLen} car.)` : "ABSENTE"}`,
    `canonical: ${s.canonical || "absent"}`,
    `meta robots: ${s.robotsMeta || "(défaut)"}`,
    `html lang: ${s.htmlLang || "absent"} · hreflang: ${s.hreflang.length ? s.hreflang.join(", ") : "aucun"}`,
    `H1: ${s.h1Count ?? "?"} · mots (home): ~${s.wordCount ?? "?"}`,
    `Open Graph: ${s.ogTags.length ? s.ogTags.join(", ") : "ABSENT"} · twitter:card: ${s.twitterCard || "absent"}`,
    `structured data (JSON-LD): ${s.jsonLdTypes.length ? s.jsonLdTypes.join(", ") : "ABSENTE"}`,
    `robots.txt: ${s.hasRobotsTxt ? "✓" : "✗"} · sitemap.xml: ${s.hasSitemap ? "✓" : "✗"} · llms.txt (GEO/AEO): ${s.hasLlmsTxt ? "✓" : "✗"}`,
  ].join("\n");
}
