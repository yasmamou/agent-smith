import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const intervals: [number, string][] = [
    [31536000, "y"],
    [2592000, "mo"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count}${label} ago`;
  }
  return "just now";
}

/** Mask a hostname/url for safe display */
export function safeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function scoreColor(score: number) {
  if (score >= 85) return "var(--color-matrix-bright)";
  if (score >= 70) return "var(--color-matrix)";
  if (score >= 50) return "var(--color-medium)";
  if (score >= 30) return "var(--color-high)";
  return "var(--color-critical)";
}

export function slugId(prefix = "id") {
  // deterministic-ish unique id without external deps
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${rand}`;
}
