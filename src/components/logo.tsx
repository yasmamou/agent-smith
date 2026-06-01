import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="relative grid h-8 w-8 place-items-center rounded-lg border border-matrix-dim bg-surface text-matrix shadow-[0_0_18px_-4px_var(--color-matrix)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7l8-4 8 4v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" strokeLinejoin="round" />
          <circle cx="12" cy="11" r="2.2" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-fg">
        Agent<span className="text-matrix">Smith</span>
      </span>
    </Link>
  );
}
