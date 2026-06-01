import type { AuditAgent } from "./base";
import { makeFinding } from "./base";
import type { Finding } from "@/types";

const SLOW_MS = 2500;
const VERY_SLOW_MS = 4500;

/**
 * PerformanceAgent — load times, slow pages, failed/heavy network.
 */
export const performanceAgent: AuditAgent = {
  meta: {
    key: "performance",
    name: "PerformanceAgent",
    role: "Load times, slow pages, network health",
    category: "performance",
  },
  run(crawl): Finding[] {
    const findings: Finding[] = [];

    const slow = crawl.pages.filter((p) => p.loadMs >= SLOW_MS);
    if (slow.length) {
      const worst = [...slow].sort((a, b) => b.loadMs - a.loadMs)[0];
      const verySlow = worst.loadMs >= VERY_SLOW_MS;
      findings.push(
        makeFinding({
          agent: "PerformanceAgent",
          title: `Slow page load (${(worst.loadMs / 1000).toFixed(1)}s on slowest route)`,
          severity: verySlow ? "high" : "medium",
          category: "performance",
          description:
            "Some pages take well over the 2.5s 'good' threshold to load. Slow first loads hurt activation, SEO and perceived quality.",
          evidence: slow
            .slice(0, 4)
            .map((p) => `${p.url} — ${(p.loadMs / 1000).toFixed(1)}s (DCL ${(p.domContentLoadedMs / 1000).toFixed(1)}s)`)
            .join("\n"),
          reproductionSteps: [
            "Open the page with a cold cache",
            "Measure load via DevTools → Performance / Lighthouse",
          ],
          probableCause:
            "Large unsplit JS bundle, unoptimized images, blocking third-party scripts, or slow server response.",
          recommendedFix:
            "Code-split heavy routes, lazy-load below-the-fold content, optimize/serve images responsively, and defer non-critical third-party scripts.",
          fixPromptBlock: `Improve load performance on the slowest routes (${slow
            .slice(0, 3)
            .map((p) => p.url)
            .join(
              ", "
            )}). Code-split, lazy-load below-the-fold sections, use next/image, and defer non-critical scripts. Target < 2.5s LCP.`,
        })
      );
    }

    const heavyNet = crawl.pages.filter((p) => p.networkErrors.length > 0);
    if (heavyNet.length && !slow.length) {
      findings.push(
        makeFinding({
          agent: "PerformanceAgent",
          title: "Failed requests adding latency / retries",
          severity: "low",
          category: "performance",
          description:
            "Failed network requests waste round-trips and can trigger client retries, degrading perceived performance.",
          evidence: heavyNet
            .slice(0, 3)
            .map((p) => `${p.url} — ${p.networkErrors.length} failed request(s)`)
            .join("\n"),
          reproductionSteps: ["DevTools → Network", "Reload and watch failed/retried requests"],
          probableCause: "Dead asset references or flaky third-party endpoints.",
          recommendedFix: "Remove dead references and add timeouts/backoff to external calls.",
          fixPromptBlock:
            "Eliminate failed requests on load and add sane timeouts/backoff to external calls so failures don't stall rendering.",
        })
      );
    }

    return findings;
  },
};
