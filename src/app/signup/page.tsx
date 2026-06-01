import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-fg-muted">Loading…</div>}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
