import type { ScreenshotRef } from "@/types";
import { slugId, safeHost } from "@/lib/utils";

/**
 * Generates lightweight, annotated SVG "screenshots" as data URIs.
 * These render instantly, are storable in SQLite, and work on serverless.
 * The real Playwright runner can override `src` with a true PNG data URI.
 */

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface ShotOptions {
  url: string;
  title: string;
  variant?: "default" | "form" | "error" | "mobile";
  annotation?: string;
  annotationColor?: string;
}

export function makeScreenshot(opts: ShotOptions): ScreenshotRef {
  const { url, title, variant = "default", annotation, annotationColor = "#ff8a3d" } = opts;
  const host = safeHost(url);
  const w = variant === "mobile" ? 390 : 1000;
  const h = variant === "mobile" ? 720 : 620;

  const blocks: string[] = [];
  if (variant === "mobile") {
    blocks.push(`<rect x="20" y="120" width="350" height="160" rx="10" fill="#0d1411" stroke="#1f3a2c"/>`);
    blocks.push(`<rect x="20" y="300" width="350" height="44" rx="8" fill="#0f1c15" stroke="#18241d"/>`);
    blocks.push(`<rect x="20" y="360" width="350" height="44" rx="8" fill="#0f1c15" stroke="#18241d"/>`);
    blocks.push(`<rect x="20" y="430" width="160" height="40" rx="8" fill="#0f8f4322" stroke="#18e26a"/>`);
  } else if (variant === "form") {
    blocks.push(`<rect x="60" y="150" width="420" height="48" rx="8" fill="#0f1c15" stroke="#18241d"/>`);
    blocks.push(`<rect x="60" y="214" width="420" height="48" rx="8" fill="#0f1c15" stroke="#18241d"/>`);
    blocks.push(`<rect x="60" y="278" width="420" height="48" rx="8" fill="#0f1c15" stroke="#18241d"/>`);
    blocks.push(`<rect x="60" y="350" width="170" height="46" rx="8" fill="#0f8f4322" stroke="#18e26a"/>`);
    blocks.push(`<rect x="560" y="150" width="380" height="246" rx="12" fill="#0d1411" stroke="#1f3a2c"/>`);
  } else if (variant === "error") {
    blocks.push(`<rect x="60" y="160" width="880" height="120" rx="12" fill="#2a0d0d" stroke="#ff4d4d55"/>`);
    blocks.push(`<text x="84" y="210" fill="#ff8a8a" font-family="monospace" font-size="18">⚠ 500 — Internal Server Error</text>`);
    blocks.push(`<text x="84" y="240" fill="#ff8a8a88" font-family="monospace" font-size="13">at handler (/app/api/route.ts:42)</text>`);
    blocks.push(`<rect x="60" y="320" width="880" height="220" rx="12" fill="#0d1411" stroke="#18241d"/>`);
  } else {
    blocks.push(`<rect x="60" y="150" width="560" height="36" rx="6" fill="#16241c"/>`);
    blocks.push(`<rect x="60" y="200" width="420" height="20" rx="4" fill="#11201a"/>`);
    blocks.push(`<rect x="60" y="260" width="150" height="44" rx="8" fill="#0f8f4322" stroke="#18e26a"/>`);
    blocks.push(`<rect x="700" y="150" width="240" height="240" rx="12" fill="#0d1411" stroke="#1f3a2c"/>`);
    blocks.push(`<rect x="60" y="360" width="880" height="180" rx="12" fill="#0a0f0c" stroke="#18241d"/>`);
  }

  const annotationSvg = annotation
    ? `<g>
         <rect x="${w - 320}" y="${h - 80}" width="300" height="58" rx="8" fill="#0a0f0c" stroke="${annotationColor}"/>
         <circle cx="${w - 300}" cy="${h - 51}" r="6" fill="${annotationColor}"/>
         <text x="${w - 282}" y="${h - 47}" fill="${annotationColor}" font-family="monospace" font-size="12">${esc(
           annotation.slice(0, 38)
         )}</text>
       </g>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#050706"/>
    <rect width="${w}" height="44" fill="#0a0f0c"/>
    <circle cx="22" cy="22" r="6" fill="#ff5f56"/><circle cx="44" cy="22" r="6" fill="#ffbd2e"/><circle cx="66" cy="22" r="6" fill="#27c93f"/>
    <rect x="100" y="12" width="${w - 140}" height="22" rx="11" fill="#0d1411" stroke="#18241d"/>
    <text x="116" y="27" fill="#5b6f64" font-family="monospace" font-size="12">${esc(host)}</text>
    <text x="60" y="100" fill="#e6f1ea" font-family="sans-serif" font-size="22" font-weight="700">${esc(
      title.slice(0, 48)
    )}</text>
    <line x1="60" y1="120" x2="${w - 60}" y2="120" stroke="#18241d"/>
    ${blocks.join("\n")}
    ${annotationSvg}
    <text x="${w - 150}" y="32" fill="#18e26a" font-family="monospace" font-size="11">AGENT&#160;SMITH</text>
  </svg>`;

  return {
    id: slugId("shot"),
    label: title,
    page: url,
    src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    caption: annotation,
  };
}
