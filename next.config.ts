import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  // Don't disclose the framework via the X-Powered-By header.
  poweredByHeader: false,
  // Keep the browser packages as real node modules (don't bundle them) so the
  // Chromium binary and native bits are available at runtime on Vercel.
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core", "playwright"],
  // Make sure the slim Chromium binary is traced into the audit-run function.
  outputFileTracingIncludes: {
    "/api/audits/[id]/run": ["./node_modules/@sparticuz/chromium/**"],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
