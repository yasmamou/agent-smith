import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-fg-muted">Loading…</div>}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
