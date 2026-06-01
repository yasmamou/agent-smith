import type { AuditAgent } from "./base";
import { makeFinding } from "./base";
import type { Finding } from "@/types";
import { SECURITY_HEADERS } from "@/lib/audit/crawl-types";

/**
 * SecurityLightAgent — PASSIVE only. Checks headers, cookies, CSP, HTTPS,
 * tech leakage and auth-related error codes.
 * Strictly no brute force, no injection, no exploitation.
 */
export const securityLightAgent: AuditAgent = {
  meta: {
    key: "security-light",
    name: "SecurityLightAgent",
    role: "Passive headers / cookies / CSP review",
    category: "security",
  },
  run(crawl): Finding[] {
    const findings: Finding[] = [];

    // HTTPS
    if (!crawl.https) {
      findings.push(
        makeFinding({
          agent: "SecurityLightAgent",
          title: "Site not served over HTTPS",
          severity: "critical",
          category: "security",
          description:
            "The target is served over plain HTTP. Traffic — including credentials — can be read or tampered with in transit.",
          evidence: `Target: ${crawl.target}`,
          reproductionSteps: ["Load the URL", "Note the http:// scheme / 'Not secure' indicator"],
          probableCause: "No TLS certificate / no HTTP→HTTPS redirect configured.",
          recommendedFix:
            "Provision TLS (most hosts do this automatically) and force-redirect all HTTP traffic to HTTPS.",
          fixPromptBlock:
            "Enforce HTTPS: provision a TLS certificate and add a permanent redirect from http:// to https:// for all routes.",
        })
      );
    }

    // Missing security headers
    const missing = SECURITY_HEADERS.filter((h) => !crawl.headers[h]);
    if (missing.length) {
      const critical = missing.includes("content-security-policy");
      findings.push(
        makeFinding({
          agent: "SecurityLightAgent",
          title: `Missing ${missing.length} recommended security header(s)`,
          severity: critical ? "high" : "medium",
          category: "security",
          description:
            "Recommended HTTP security headers are absent. These are cheap, high-leverage defenses against clickjacking, MIME sniffing and XSS.",
          evidence: `Missing: ${missing.join(", ")}`,
          reproductionSteps: [
            "curl -I the site (or DevTools → Network → response headers)",
            "Compare against the recommended security header set",
          ],
          probableCause: "Default framework/host config without a hardened header policy.",
          recommendedFix:
            "Add the missing headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) via middleware or host config.",
          fixPromptBlock: `Add these missing HTTP security headers via next.config headers() or middleware: ${missing.join(
            ", "
          )}. Start CSP in report-only mode, then enforce.`,
        })
      );
    }

    // Insecure cookies
    const weakCookies = crawl.cookies.filter((c) => !c.secure || !c.httpOnly || c.sameSite === "none");
    if (weakCookies.length) {
      findings.push(
        makeFinding({
          agent: "SecurityLightAgent",
          title: `Cookies missing Secure/HttpOnly/SameSite (${weakCookies.length})`,
          severity: "medium",
          category: "security",
          description:
            "One or more cookies lack hardening flags, increasing exposure to theft via XSS or transmission over insecure channels.",
          evidence: weakCookies
            .slice(0, 4)
            .map(
              (c) =>
                `${c.name}: secure=${c.secure} httpOnly=${c.httpOnly} sameSite=${c.sameSite || "unset"}`
            )
            .join("\n"),
          reproductionSteps: ["DevTools → Application → Cookies", "Inspect the flags on each cookie"],
          probableCause: "Cookies set without explicit security attributes.",
          recommendedFix:
            "Set Secure + HttpOnly + SameSite=Lax (or Strict) on session/auth cookies. Reserve SameSite=None for genuine cross-site needs and pair with Secure.",
          fixPromptBlock:
            "Harden all auth/session cookies: set Secure, HttpOnly and SameSite=Lax. Only use SameSite=None where cross-site is required, and always with Secure.",
        })
      );
    }

    // Tech leakage
    if (crawl.techLeaks.length) {
      findings.push(
        makeFinding({
          agent: "SecurityLightAgent",
          title: "Technical stack disclosed via headers/errors",
          severity: "low",
          category: "security",
          description:
            "The server discloses framework/version details. While not a vulnerability itself, it helps attackers target known CVEs.",
          evidence: crawl.techLeaks.join("\n"),
          reproductionSteps: ["Inspect response headers", "Note Server / X-Powered-By disclosures"],
          probableCause: "Default server signature / verbose error pages.",
          recommendedFix:
            "Remove or generalize Server / X-Powered-By headers and ensure production error pages don't leak stack traces.",
          fixPromptBlock:
            "Suppress version disclosure: remove X-Powered-By, generalize the Server header, and ensure production errors never render stack traces to users.",
        })
      );
    }

    return findings;
  },
};
