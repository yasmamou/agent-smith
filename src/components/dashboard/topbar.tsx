"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Plus, Store, LogOut, KeyRound, Coins, BarChart3 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Audits", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/audits/new", label: "New audit", icon: Plus, exact: false },
  { href: "/marketplace", label: "Marketplace", icon: Store, exact: false },
  { href: "/dashboard/analytics", label: "Visibilité", icon: BarChart3, exact: false },
  { href: "/dashboard/api", label: "API", icon: KeyRound, exact: false },
  { href: "/dashboard/billing", label: "Crédits", icon: Coins, exact: false },
];

export function Topbar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && typeof d.balance === "number") setBalance(d.balance); })
      .catch(() => {});
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <div className="flex items-center gap-8">
          <Logo href="/dashboard" />
          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map((l) => {
              const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    active ? "bg-surface text-fg" : "text-fg-muted hover:text-fg hover:bg-surface/60"
                  )}
                >
                  <l.icon className="size-4" />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {balance !== null && (
            <Link
              href="/dashboard/billing"
              title="Crédits restants"
              className="inline-flex items-center gap-1.5 rounded-full border border-matrix-dim/50 bg-matrix/5 px-2.5 py-1 text-xs font-medium text-matrix transition-colors hover:bg-matrix/10"
            >
              <Coins className="size-3.5" /> {balance}
            </Link>
          )}
          <span className="hidden text-sm text-fg-faint md:inline">{email}</span>
          <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
