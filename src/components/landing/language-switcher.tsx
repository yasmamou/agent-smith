"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@/lib/i18n";

export function LanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function set(locale: Locale) {
    if (locale === current) return;
    document.cookie = `lang=${locale}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  }

  return (
    <div className="flex items-center rounded-lg border border-border text-xs" aria-label="Language">
      {(["fr", "en"] as Locale[]).map((l) => (
        <button
          key={l}
          onClick={() => set(l)}
          disabled={pending}
          className={`px-2 py-1 font-medium uppercase transition-colors ${
            current === l ? "text-matrix" : "text-fg-faint hover:text-fg"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
