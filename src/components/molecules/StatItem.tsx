import * as React from "react";
import { cn } from "@/lib/utils";
import { StatNumber } from "@/components/atoms/StatNumber";
import type { LucideIcon } from "lucide-react";

interface StatItemProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  highlight?: boolean;
  className?: string;
  valueClassName?: string;
}

export function StatItem({ icon: Icon, value, label, highlight, className, valueClassName }: StatItemProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <Icon size={18} className={highlight ? "text-blood" : "text-muted"} />
      <StatNumber value={value} label={label} highlight={highlight} valueClassName={valueClassName} />
    </div>
  );
}
