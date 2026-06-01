import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-lg border border-border bg-bg-elevated px-3.5 text-sm text-fg placeholder:text-fg-faint",
        "focus:border-matrix-dim focus:outline-none focus:ring-2 focus:ring-matrix/20 transition-colors",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[88px] w-full rounded-lg border border-border bg-bg-elevated px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-faint",
      "focus:border-matrix-dim focus:outline-none focus:ring-2 focus:ring-matrix/20 transition-colors resize-y",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-fg", className)}
      {...props}
    />
  );
}
