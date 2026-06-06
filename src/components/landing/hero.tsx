"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { MatrixRain } from "@/components/matrix-rain";
import { AuditTerminal } from "./audit-terminal";
import { TryAudit } from "./try-audit";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid" />
      <MatrixRain className="pointer-events-none absolute inset-0 h-full w-full" opacity={0.12} />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-2 lg:items-center lg:pt-24">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-matrix-dim/50 bg-matrix/5 px-3 py-1 text-xs text-matrix-bright"
          >
            <Sparkles className="size-3.5" />
            Autonomous QA for vibe-coded apps
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-balance text-4xl font-bold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-6xl"
          >
            Your AI QA agent after every{" "}
            <span className="text-matrix text-glow">deploy</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 max-w-xl text-balance text-lg font-medium text-fg"
          >
            In plain terms: an agent tests your live app, finds what&apos;s broken, and
            hands you the fix — ready to paste into your editor.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mt-3 max-w-xl text-sm text-fg-muted"
          >
            Paste a URL — agents explore the app, click every button, test forms and
            real user flows, then write a fix prompt ready for Claude Code, Cursor or
            any editor. Built for vibe-coded apps; works for any site.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
          >
            <TryAudit />
            <div className="mt-3">
              <a href="#sample" className="text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline">
                ou regarde un exemple de rapport →
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-fg-faint"
          >
            <span>Works with Cursor · Claude Code · Lovable · Bolt · v0 · Antigravity</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <AuditTerminal />
        </motion.div>
      </div>
    </section>
  );
}
