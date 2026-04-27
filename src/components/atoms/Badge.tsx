import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "danger" | "muted";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-2 text-gray-300 border-subtle",
  success: "bg-emerald-900/40 text-emerald-400 border-emerald-800/50",
  danger: "bg-blood/10 text-blood border-blood/30",
  muted: "bg-surface text-muted border-subtle",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
