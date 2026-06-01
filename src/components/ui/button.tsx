import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matrix/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-matrix text-black font-semibold hover:bg-matrix-bright shadow-[0_0_24px_-6px_var(--color-matrix)] hover:shadow-[0_0_30px_-4px_var(--color-matrix)]",
        secondary:
          "bg-surface text-fg border border-border-bright hover:border-matrix-dim hover:bg-bg-elevated",
        ghost: "text-fg-muted hover:text-fg hover:bg-surface",
        outline:
          "border border-border-bright text-fg hover:border-matrix hover:text-matrix-bright",
        danger: "bg-critical/15 text-critical border border-critical/40 hover:bg-critical/25",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

export { buttonVariants };
