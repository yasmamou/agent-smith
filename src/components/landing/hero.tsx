"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { MatrixRain } from "@/components/matrix-rain";
import { MatrixGlobe } from "@/components/matrix-globe";
import { AuditTerminal } from "./audit-terminal";
import { TryAudit } from "./try-audit";
import type { Dict } from "@/lib/i18n";

export function Hero({ t }: { t: Dict }) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid" />
      <MatrixRain className="pointer-events-none absolute inset-0 h-full w-full" opacity={0.12} />
      <MatrixGlobe className="pointer-events-none absolute -right-24 top-1/2 hidden h-[560px] w-[560px] -translate-y-1/2 opacity-60 [mask-image:radial-gradient(circle,black_55%,transparent_75%)] lg:block" />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-2 lg:items-center lg:pt-24">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-matrix-dim/50 bg-matrix/5 px-3 py-1 text-xs text-matrix-bright"
          >
            <Sparkles className="size-3.5" />
            {t.hero.badge}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-balance text-4xl font-bold leading-[1.04] tracking-[-0.02em] text-fg sm:text-5xl lg:text-6xl"
          >
            {t.hero.h1}
            <span className="text-matrix text-glow">{t.hero.h1accent}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 max-w-xl text-balance text-lg font-medium text-fg"
          >
            {t.hero.plain}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mt-3 max-w-xl text-sm text-fg-muted"
          >
            {t.hero.support}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
          >
            <TryAudit t={t} />
            <div className="mt-3">
              <a href="#sample" className="text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline">
                {t.hero.orSample}
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-fg-faint"
          >
            <span>{t.hero.works}</span>
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
