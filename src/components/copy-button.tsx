"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  className,
  variant = "secondary",
  size = "sm",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <Button variant={variant} size={size} onClick={copy} className={cn(className)}>
      {copied ? <Check className="text-matrix" /> : <Copy />}
      {copied ? copiedLabel : label}
    </Button>
  );
}
