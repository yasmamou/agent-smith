import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import type { Dict, Locale } from "@/lib/i18n";

export function Navbar({ t, locale }: { t: Dict; locale: Locale }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-fg-muted md:flex">
          <a href="#how" className="hover:text-fg transition-colors">{t.nav.how}</a>
          <a href="#features" className="hover:text-fg transition-colors">{t.nav.features}</a>
          <a href="#agents" className="hover:text-fg transition-colors">{t.nav.agents}</a>
          <Link href="/marketplace" className="hover:text-fg transition-colors">{t.nav.marketplace}</Link>
          <a href="#pricing" className="hover:text-fg transition-colors">{t.nav.pricing}</a>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher current={locale} />
          <Link href="/login">
            <Button variant="ghost" size="sm">{t.nav.signin}</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">{t.nav.cta}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
