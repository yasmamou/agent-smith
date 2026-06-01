import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PricingTable() {
  return (
    <div className="grid gap-5 lg:grid-cols-4">
      {PLANS.map((plan) => (
        <div
          key={plan.name}
          className={cn(
            "relative flex flex-col rounded-2xl p-6",
            plan.highlight ? "glass-bright" : "glass"
          )}
        >
          {plan.highlight && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-matrix px-3 py-0.5 text-[11px] font-semibold text-black">
              Most popular
            </span>
          )}
          <h3 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">{plan.name}</h3>
          <div className="mt-3 flex items-end gap-1">
            <span className="text-3xl font-bold text-fg">{plan.price}</span>
            <span className="mb-1 text-sm text-fg-faint">{plan.period}</span>
          </div>
          <p className="mt-2 min-h-[40px] text-sm text-fg-muted">{plan.tagline}</p>
          <ul className="mt-5 flex-1 space-y-2.5">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-fg-muted">
                <Check className="mt-0.5 size-4 shrink-0 text-matrix" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link href="/signup" className="mt-6">
            <Button variant={plan.highlight ? "primary" : "outline"} className="w-full">
              {plan.cta}
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}
