import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-subtle py-16 text-center",
        className
      )}
    >
      {Icon && <Icon size={40} className="text-muted" strokeWidth={1.5} />}
      <p className="text-sm font-semibold text-gray-300">{title}</p>
      {description && <p className="text-xs text-muted">{description}</p>}
    </div>
  );
}
