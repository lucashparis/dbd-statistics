import * as React from "react";
import { cn } from "@/lib/utils";

interface TagProps {
  children: React.ReactNode;
  className?: string;
}

export function Tag({ children, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-blood/40 bg-blood/10",
        "px-3 py-1 text-xs font-medium text-blood",
        className
      )}
    >
      {children}
    </span>
  );
}
