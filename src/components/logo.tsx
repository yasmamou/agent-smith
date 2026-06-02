import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-block h-8 w-8 overflow-hidden rounded-full ring-1 ring-matrix-dim shadow-[0_0_16px_-4px_var(--color-matrix)] transition-shadow group-hover:shadow-[0_0_22px_-2px_var(--color-matrix)]">
        <Image
          src="/agent-smith-logo.png"
          alt="Agent Smith"
          fill
          sizes="32px"
          className="object-cover"
          priority
        />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-fg">
        Agent<span className="text-matrix">Smith</span>
      </span>
    </Link>
  );
}
