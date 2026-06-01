import type { AuditAgent } from "./base";
import { makeFinding } from "./base";
import type { Finding } from "@/types";

/**
 * FunctionalQAAgent — tests buttons, forms, console errors, network errors,
 * broken links and bad status codes.
 */
export const functionalQaAgent: AuditAgent = {
  meta: {
    key: "functional-qa",
    name: "FunctionalQAAgent",
    role: "Buttons, forms, console & network errors",
    category: "functional",
  },
  run(crawl): Finding[] {
    const findings: Finding[] = [];

    // Console errors
    const pagesWithConsole = crawl.pages.filter((p) => p.consoleErrors.length > 0);
    if (pagesWithConsole.length) {
      const sample = pagesWithConsole[0];
      findings.push(
        makeFinding({
          agent: "FunctionalQAAgent",
          title: `JavaScript console errors on ${pagesWithConsole.length} page(s)`,
          severity: "high",
          category: "functional",
          description:
            "Uncaught JavaScript errors were logged in the browser console while exploring the app. These often break interactivity downstream even when the page looks fine.",
          evidence: `${sample.url}\n› ${sample.consoleErrors.slice(0, 3).join("\n› ")}`,
          reproductionSteps: [
            `Open ${sample.url}`,
            "Open DevTools → Console",
            "Reload and interact with the page",
            "Observe the logged errors",
          ],
          probableCause:
            "Unhandled promise rejection, undefined access on a missing prop, or a third-party script failing to load.",
          recommendedFix:
            "Add defensive null-checks, wrap async handlers in try/catch, and guard third-party script usage. Treat console errors as build-blocking.",
          fixPromptBlock: `Fix the following console errors without changing intended behaviour:\n${sample.consoleErrors
            .slice(0, 5)
            .map((e) => `- ${e}`)
            .join("\n")}\nTrace each to its source component, add guards, and ensure the page is error-free on load.`,
        })
      );
    }

    // Network errors / bad status codes
    const netPages = crawl.pages.filter((p) => p.networkErrors.length > 0);
    if (netPages.length) {
      const errs = netPages.flatMap((p) => p.networkErrors).slice(0, 4);
      findings.push(
        makeFinding({
          agent: "FunctionalQAAgent",
          title: `Failed network requests (${errs.length}+ resources)`,
          severity: "high",
          category: "functional",
          description:
            "Several network requests returned error status codes. Failing API calls and assets cause silent feature breakage and blank states.",
          evidence: errs.map((e) => `${e.status} — ${e.url}`).join("\n"),
          reproductionSteps: [
            "Open the page",
            "Open DevTools → Network",
            "Reload and filter by status ≥ 400",
          ],
          probableCause:
            "Wrong endpoint path, missing auth header, CORS misconfiguration, or a removed asset still referenced in code.",
          recommendedFix:
            "Verify each failing endpoint, add error handling + retry/backoff for transient calls, and surface a user-visible fallback for failures.",
          fixPromptBlock: `These network requests are failing:\n${errs
            .map((e) => `- [${e.status}] ${e.url}`)
            .join("\n")}\nFind where each is called, fix the path/headers, and add graceful error UI for failures.`,
        })
      );
    }

    // Bad page status
    const badPages = crawl.pages.filter((p) => p.statusCode >= 400);
    if (badPages.length) {
      findings.push(
        makeFinding({
          agent: "FunctionalQAAgent",
          title: `${badPages.length} route(s) returning ${badPages[0].statusCode}`,
          severity: badPages.some((p) => p.statusCode >= 500) ? "critical" : "medium",
          category: "functional",
          description:
            "Routes that are linked from the UI return error status codes, leading users into dead ends.",
          evidence: badPages.map((p) => `${p.statusCode} — ${p.url}`).join("\n"),
          reproductionSteps: ["Click the linked navigation item", "Observe the error page"],
          probableCause: "Missing route handler, server exception, or stale link to a deleted page.",
          recommendedFix:
            "Implement or fix the failing routes, and add a friendly 404/500 boundary so users can recover.",
          fixPromptBlock: `These routes return errors: ${badPages
            .map((p) => `${p.url} (${p.statusCode})`)
            .join(
              ", "
            )}. Fix the underlying handlers and add proper error.tsx / not-found.tsx boundaries.`,
        })
      );
    }

    // Forms without proper labels (functional + a11y)
    const formPages = crawl.pages.filter((p) => p.forms > 0 && p.inputsWithoutLabel > 0);
    if (formPages.length) {
      const p = formPages[0];
      findings.push(
        makeFinding({
          agent: "FunctionalQAAgent",
          title: `Form inputs without associated labels (${p.inputsWithoutLabel})`,
          severity: "medium",
          category: "functional",
          description:
            "Form fields lack programmatically associated labels. This breaks autofill, accessibility and form validation messaging.",
          evidence: `${p.url} — ${p.inputsWithoutLabel} of the inputs in ${p.forms} form(s) have no <label for>.`,
          reproductionSteps: [
            `Open ${p.url}`,
            "Inspect the form inputs",
            "Notice missing label/aria-label association",
          ],
          probableCause: "Placeholder used in place of a real label, or missing htmlFor/id wiring.",
          recommendedFix:
            "Associate every input with a <label htmlFor> (or aria-label). Keep placeholders as hints only.",
          fixPromptBlock:
            "Audit all forms and ensure each input has an associated <label htmlFor=…> with matching id (or an aria-label). Do not rely on placeholders as labels.",
        })
      );
    }

    return findings;
  },
};
