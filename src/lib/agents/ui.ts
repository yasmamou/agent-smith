import type { AuditAgent } from "./base";
import { makeFinding } from "./base";
import type { Finding } from "@/types";

/**
 * UIAgent — responsive, contrast, consistency, design hygiene.
 */
export const uiAgent: AuditAgent = {
  meta: {
    key: "ui",
    name: "UIAgent",
    role: "Responsive, contrast, consistency, design",
    category: "ui",
  },
  run(crawl): Finding[] {
    const findings: Finding[] = [];

    // Missing viewport meta → not responsive
    const noViewport = crawl.pages.filter((p) => !p.hasViewportMeta);
    if (noViewport.length) {
      findings.push(
        makeFinding({
          agent: "UIAgent",
          title: "Missing responsive viewport meta tag",
          severity: "high",
          category: "ui",
          description:
            "Pages lack a <meta name=\"viewport\"> tag, so mobile browsers render a zoomed-out desktop layout — a major mobile UX failure.",
          evidence: noViewport
            .slice(0, 3)
            .map((p) => p.url)
            .join("\n"),
          reproductionSteps: ["Open the page on a phone (or device emulation)", "Note the tiny zoomed-out layout"],
          probableCause: "Viewport meta omitted from the document head / layout.",
          recommendedFix:
            'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the root layout.',
          fixPromptBlock:
            'Add the responsive viewport meta tag to the root layout/head: <meta name="viewport" content="width=device-width, initial-scale=1">.',
        })
      );
    }

    // Low contrast samples
    const lowContrast = crawl.pages.filter((p) => p.lowContrastSamples > 0);
    if (lowContrast.length) {
      const total = lowContrast.reduce((s, p) => s + p.lowContrastSamples, 0);
      findings.push(
        makeFinding({
          agent: "UIAgent",
          title: `Low-contrast text detected (${total} sample(s))`,
          severity: "medium",
          category: "ui",
          description:
            "Several text/background pairs fall below the WCAG AA 4.5:1 contrast ratio, making copy hard to read for many users.",
          evidence: lowContrast
            .slice(0, 3)
            .map((p) => `${p.url} — ${p.lowContrastSamples} low-contrast element(s)`)
            .join("\n"),
          reproductionSteps: [
            "Open the page",
            "Run an accessibility contrast check (e.g. DevTools / axe)",
            "Inspect the flagged text",
          ],
          probableCause: "Muted grey-on-grey palette, or placeholder text used as primary copy.",
          recommendedFix:
            "Raise foreground/background contrast to ≥ 4.5:1 for body text (≥ 3:1 for large text). Reserve faint greys for non-essential hints.",
          fixPromptBlock:
            "Audit text colours and ensure all body text meets WCAG AA contrast (≥4.5:1). Darken/lighten muted greys used for primary copy.",
        })
      );
    }

    // Images missing alt
    const altPages = crawl.pages.filter((p) => p.imagesMissingAlt > 0);
    if (altPages.length) {
      const total = altPages.reduce((s, p) => s + p.imagesMissingAlt, 0);
      findings.push(
        makeFinding({
          agent: "UIAgent",
          title: `Images missing alt text (${total})`,
          severity: "low",
          category: "ui",
          description:
            "Images without alt attributes are invisible to screen readers and degrade SEO. Decorative images should use empty alt.",
          evidence: altPages
            .slice(0, 3)
            .map((p) => `${p.url} — ${p.imagesMissingAlt}/${p.images} images missing alt`)
            .join("\n"),
          reproductionSteps: ["Inspect <img> elements", "Note missing alt attributes"],
          probableCause: "Alt text skipped during fast iteration.",
          recommendedFix:
            'Add descriptive alt to meaningful images and alt="" to purely decorative ones.',
          fixPromptBlock:
            'Add meaningful alt text to all content images, and alt="" to decorative ones. Flag any <img> with no alt attribute.',
        })
      );
    }

    return findings;
  },
};
