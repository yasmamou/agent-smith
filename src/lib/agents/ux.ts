import type { AuditAgent } from "./base";
import { makeFinding } from "./base";
import type { Finding } from "@/types";

/**
 * UXAgent — clarity, friction, onboarding, visual hierarchy.
 */
export const uxAgent: AuditAgent = {
  meta: {
    key: "ux",
    name: "UXAgent",
    role: "Clarity, friction, onboarding, hierarchy",
    category: "ux",
  },
  run(crawl): Finding[] {
    const findings: Finding[] = [];

    // Missing / multiple H1 → weak hierarchy
    const noH1 = crawl.pages.filter((p) => p.h1Count === 0);
    const multiH1 = crawl.pages.filter((p) => p.h1Count > 1);
    if (noH1.length) {
      findings.push(
        makeFinding({
          agent: "UXAgent",
          title: `No clear primary heading on ${noH1.length} page(s)`,
          severity: "low",
          category: "ux",
          description:
            "Pages without a single H1 give users (and screen readers / SEO) no anchor for what the page is about, weakening visual hierarchy.",
          evidence: noH1
            .slice(0, 3)
            .map((p) => p.url)
            .join("\n"),
          reproductionSteps: ["Open the page", "Scan top-to-bottom", "Note the absence of a dominant heading"],
          probableCause: "Heading rendered as a styled <div>, or skipped to ship faster.",
          recommendedFix:
            "Give each page exactly one descriptive <h1> that states the page's purpose, then size headings by importance.",
          fixPromptBlock:
            "Ensure every page has exactly one semantic <h1> describing its purpose and a consistent heading scale (h1→h2→h3).",
        })
      );
    }
    if (multiH1.length) {
      findings.push(
        makeFinding({
          agent: "UXAgent",
          title: "Multiple competing H1 headings",
          severity: "info",
          category: "ux",
          description:
            "More than one H1 per page creates competing focal points and dilutes the visual hierarchy.",
          evidence: multiH1
            .slice(0, 3)
            .map((p) => `${p.url} — ${p.h1Count} H1s`)
            .join("\n"),
          reproductionSteps: ["Inspect the page outline", "Count the H1 elements"],
          probableCause: "Reused hero components each rendering their own H1.",
          recommendedFix: "Keep one H1 per page; demote the rest to H2/H3.",
          fixPromptBlock: "Collapse multiple H1s to a single page-level H1 and demote the others to H2/H3.",
        })
      );
    }

    // Thin pages → unclear value / empty states
    const thin = crawl.pages.filter((p) => p.textLength < 220 && p.statusCode < 400);
    if (thin.length) {
      findings.push(
        makeFinding({
          agent: "UXAgent",
          title: `Sparse content / likely empty states (${thin.length} page)`,
          severity: "low",
          category: "ux",
          description:
            "Some pages render very little content. If these are empty states, they should guide the user toward a first action instead of looking broken.",
          evidence: thin
            .slice(0, 3)
            .map((p) => `${p.url} — ~${p.textLength} chars`)
            .join("\n"),
          reproductionSteps: ["Open the page with no data", "Observe the blank/sparse view"],
          probableCause: "Missing empty-state design for zero-data scenarios.",
          recommendedFix:
            "Design explicit empty states with a one-line explanation and a primary CTA to create the first item.",
          fixPromptBlock:
            "Add friendly empty states (illustration + one-line copy + primary CTA) to any list/dashboard view that can render with zero data.",
        })
      );
    }

    // Generic UX heuristics — onboarding/first-run guidance
    findings.push(
      makeFinding({
        agent: "UXAgent",
        title: "No visible first-run guidance for new users",
        severity: "low",
        category: "ux",
        description:
          "The landing/app entry does not surface an obvious next step for a brand-new user. A single, unmistakable primary CTA lifts activation.",
        evidence: `Entry page: ${crawl.pages[0]?.url ?? crawl.target}`,
        reproductionSteps: [
          "Open the site as a logged-out first-time visitor",
          "Look for one obvious next action above the fold",
        ],
        probableCause: "Multiple equally-weighted CTAs, or value proposition buried below the fold.",
        recommendedFix:
          "Lead with a single primary CTA and a one-sentence value prop above the fold; demote secondary actions.",
        fixPromptBlock:
          "On the entry page, make one primary CTA visually dominant above the fold, with a single-sentence value proposition. Demote secondary links to ghost/outline styling.",
      })
    );

    return findings;
  },
};
