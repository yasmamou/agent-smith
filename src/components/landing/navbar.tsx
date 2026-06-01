import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-fg-muted md:flex">
          <a href="#how" className="hover:text-fg transition-colors">How it works</a>
          <a href="#features" className="hover:text-fg transition-colors">Features</a>
          <a href="#agents" className="hover:text-fg transition-colors">Agents</a>
          <Link href="/marketplace" className="hover:text-fg transition-colors">Marketplace</Link>
          <a href="#pricing" className="hover:text-fg transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Run your first audit</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
