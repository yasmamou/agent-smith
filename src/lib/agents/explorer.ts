import type { AuditAgent } from "./base";
import { makeFinding } from "./base";
import type { Finding } from "@/types";

/**
 * ExplorerAgent — discovers pages, buttons, links and forms.
 * The crawl itself is performed by the engine; this agent reports on
 * reachability and coverage gaps it noticed while mapping the surface.
 */
export const explorerAgent: AuditAgent = {
  meta: {
    key: "explorer",
    name: "ExplorerAgent",
    role: "Discovers pages, links, buttons, forms",
    category: "functional",
  },
  run(crawl): Finding[] {
    const findings: Finding[] = [];

    if (!crawl.reachable) {
      findings.push(
        makeFinding({
          agent: "ExplorerAgent",
          title: "Target was unreachable",
          severity: "critical",
          category: "functional",
          description:
            "The crawler could not load the target URL. The site may be down, blocking automated clients, or behind an IP allowlist.",
          evidence: `Target: ${crawl.target}`,
          reproductionSteps: ["Open the URL in a fresh browser", "Confirm it loads without a VPN/allowlist"],
          probableCause: "Server down, DNS failure, bot protection, or an IP/API-key allowlist excluding the agent.",
          recommendedFix:
            "Confirm the deployment is live and, if access is gated, allowlist the audit runner's IP / supply an API key.",
          fixPromptBlock:
            "Verify the deployment is reachable publicly (or document the allowlist requirement). Check DNS, health checks and any bot protection that blocks headless clients.",
        })
      );
      return findings;
    }

    const broken = crawl.pages.flatMap((p) => p.brokenLinks);
    if (broken.length) {
      findings.push(
        makeFinding({
          agent: "ExplorerAgent",
          title: `Broken internal links discovered (${broken.length})`,
          severity: "medium",
          category: "functional",
          description:
            "While mapping navigation, the explorer found internal links pointing to missing destinations.",
          evidence: broken.slice(0, 5).join("\n"),
          reproductionSteps: ["Click the navigation links", "Observe links resolving to 404/empty pages"],
          probableCause: "Renamed/removed routes still referenced, or relative-path mistakes.",
          recommendedFix:
            "Fix or remove the broken links and add a link-check step to CI to catch regressions.",
          fixPromptBlock: `Fix these broken internal links: ${broken
            .slice(0, 8)
            .join(", ")}. Update or remove the references and add an automated link check.`,
        })
      );
    }

    return findings;
  },
};
