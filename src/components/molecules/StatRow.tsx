import * as React from "react";
import { cn } from "@/lib/utils";
import { StatNumber } from "@/components/atoms/StatNumber";
import { Divider } from "@/components/atoms/Divider";

interface StatRowProps {
  wins: number;
  losses: number;
  total: number;
  className?: string;
}

export function StatRow({ wins, losses, total, className }: StatRowProps) {
  return (
    <div className={cn("flex items-center justify-around", className)}>
      <StatNumber value={wins} label="Wins" valueClassName="text-emerald-400" />
      <Divider orientation="vertical" />
      <StatNumber value={losses} label="Losses" valueClassName="text-blood" />
      <Divider orientation="vertical" />
      <StatNumber value={total} label="Total" />
    </div>
  );
}
