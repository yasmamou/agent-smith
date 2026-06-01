import type { Severity, Category } from "@/types";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "border-critical/40 bg-critical/10 text-critical",
  high: "border-high/40 bg-high/10 text-high",
  medium: "border-medium/40 bg-medium/10 text-medium",
  low: "border-low/40 bg-low/10 text-low",
  info: "border-border-bright bg-surface text-fg-muted",
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        SEVERITY_STYLES[severity],
        className
      )}
    >
      {severity}
    </span>
  );
}

const CATEGORY_LABEL: Record<Category, string> = {
  functional: "Functional",
  ui: "UI",
  ux: "UX",
  security: "Security",
  performance: "Performance",
};

export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border-bright bg-bg-elevated px-2 py-0.5 text-[11px] font-medium text-fg-muted",
        className
      )}
    >
      {CATEGORY_LABEL[category]}
    </span>
  );
}
