import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  bright,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { bright?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl p-5 transition-all duration-150 ease-out hover:-translate-y-0.5",
        bright ? "glass-bright" : "glass",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-start justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold text-fg", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-fg-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm text-fg-muted", className)} {...props} />;
}
