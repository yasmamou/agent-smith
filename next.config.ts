import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the browser packages as real node modules (don't bundle them) so the
  // Chromium binary and native bits are available at runtime on Vercel.
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core", "playwright"],
  // Make sure the slim Chromium binary is traced into the audit-run function.
  outputFileTracingIncludes: {
    "/api/audits/[id]/run": ["./node_modules/@sparticuz/chromium/**"],
  },
};

export default nextConfig;
