import { launchSession } from "./session";

/**
 * Render an HTML string to a PDF buffer using the shared browser session
 * (Browserbase remote Chrome on serverless, local Chromium in dev).
 */
export async function renderPdf(html: string): Promise<Buffer> {
  const { browser, context } = await launchSession({ viewport: { width: 1240, height: 1754 } });
  try {
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const buf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "11mm", left: "11mm", right: "11mm" },
    });
    return Buffer.from(buf);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
