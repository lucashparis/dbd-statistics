import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface IconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
  "aria-label"?: string;
}

export function Icon({ icon: LucideIconComponent, size = 16, className, "aria-label": ariaLabel }: IconProps) {
  return (
    <LucideIconComponent
      size={size}
      className={cn("shrink-0", className)}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
    />
  );
}
