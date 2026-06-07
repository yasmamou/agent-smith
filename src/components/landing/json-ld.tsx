/**
 * Structured data (schema.org JSON-LD) for the landing page — helps Google rich
 * results AND gives LLM answer engines (GEO/AEO) clean facts to cite.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://agent-smith-iota.vercel.app";

export function LandingJsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BASE}/#organization`,
        name: "Agent Smith",
        url: BASE,
        logo: `${BASE}/agent-smith-logo.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${BASE}/#website`,
        url: BASE,
        name: "Agent Smith",
        publisher: { "@id": `${BASE}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: "Agent Smith",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        url: BASE,
        description:
          "AI QA agent that audits any deployed web app: a swarm of agents crawls the site with a real browser, tests user flows, and returns a scored report plus a ready-to-paste fix prompt for Claude Code or Cursor.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", description: "Free plan — instant audit, no credit card" },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is Agent Smith?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Agent Smith is an AI QA agent that audits a deployed web app. It crawls the site with a real browser, tests functional, UI, UX, security and performance quality, tries to complete the main user flow, and returns a scored report plus a fix prompt ready to paste into Claude Code or Cursor.",
            },
          },
          {
            "@type": "Question",
            name: "Do I need an account to try it?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. You can paste a URL on the homepage and get an instant audit preview without signing up. An account unlocks the full report, the fix prompt and audit history.",
            },
          },
          {
            "@type": "Question",
            name: "Can it run automatically after each deploy?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. A post-deploy webhook (or the REST API, MCP server and CLI) lets Agent Smith audit every deployment and report a regression diff versus the previous run.",
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
