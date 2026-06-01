"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { MatrixRain } from "@/components/matrix-rain";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    const next = params.get("next") || "/dashboard";
    router.push(next);
    router.refresh();
  }

  function useDemo() {
    setLoading(true);
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@agentsmith.dev", password: "demo1234" }),
    }).then(async (res) => {
      setLoading(false);
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Demo account unavailable — run `npm run db:seed`.");
      }
    });
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-5">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <MatrixRain className="pointer-events-none absolute inset-0 h-full w-full" opacity={0.08} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-bright relative w-full max-w-md rounded-2xl p-8"
      >
        <Logo className="mb-6" />
        <h1 className="text-2xl font-bold text-fg">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-sm text-fg-muted">
          {isSignup ? "Start auditing your deploys in minutes." : "Sign in to run and review audits."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {isSignup && (
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Ada Lovelace" autoComplete="name" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@startup.com" autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-critical">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Working…" : isSignup ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-fg-faint">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="secondary" className="w-full" onClick={useDemo} disabled={loading}>
          Continue with demo account
        </Button>

        <p className="mt-6 text-center text-sm text-fg-muted">
          {isSignup ? "Already have an account? " : "New to Agent Smith? "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-matrix hover:text-matrix-bright">
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
