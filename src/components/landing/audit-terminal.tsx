"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const LINES: { t: string; cls?: string }[] = [
  { t: "$ agent-smith audit https://my-saas.app --agents 5", cls: "text-fg" },
  { t: "→ ExplorerAgent     mapped 7 pages, 42 buttons, 4 forms", cls: "text-fg-muted" },
  { t: "→ FunctionalQAAgent 3 console errors · 2 failed requests", cls: "text-high" },
  { t: "→ UIAgent           low-contrast text on /pricing", cls: "text-medium" },
  { t: "→ UXAgent           no empty-state on /dashboard", cls: "text-low" },
  { t: "→ SecurityLight     missing CSP + HSTS headers", cls: "text-high" },
  { t: "→ PerformanceAgent  /dashboard loads in 4.1s", cls: "text-medium" },
  { t: "→ PromptFixAgent    compiled fix prompt ✓", cls: "text-matrix" },
  { t: "", cls: "" },
  { t: "  Overall score: 74/100  ·  12 findings  ·  ready ✓", cls: "text-matrix-bright" },
];

export function AuditTerminal() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count >= LINES.length) {
      const reset = setTimeout(() => setCount(0), 3500);
      return () => clearTimeout(reset);
    }
    const id = setTimeout(() => setCount((c) => c + 1), count === 0 ? 600 : 420);
    return () => clearTimeout(id);
  }, [count]);

  return (
    <div className="glass-bright overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="size-3 rounded-full bg-[#ff5f56]" />
        <span className="size-3 rounded-full bg-[#ffbd2e]" />
        <span className="size-3 rounded-full bg-[#27c93f]" />
        <span className="ml-3 font-mono text-xs text-fg-faint">agent-smith — live audit</span>
      </div>
      <div className="min-h-[286px] space-y-1 p-4 font-mono text-[13px] leading-relaxed">
        {LINES.slice(0, count).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className={line.cls}
          >
            {line.t || " "}
          </motion.div>
        ))}
        {count < LINES.length && <span className="cursor-blink text-matrix" />}
      </div>
    </div>
  );
}
