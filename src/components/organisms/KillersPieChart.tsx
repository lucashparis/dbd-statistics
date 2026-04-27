"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "@/components/molecules/ChartTooltip";
import type { KillerStats } from "@/types/killer";

interface KillersPieChartProps {
  killers: KillerStats[];
  mode: "appearances" | "winloss";
  selectedKiller?: KillerStats | null;
}

const BLOOD_PALETTE = [
  "#DC143C", "#FF4560", "#E63950", "#C41030", "#FF6B7A",
  "#A50E2C", "#FF8C94", "#8B0000", "#FF2244", "#D63031",
  "#FF6B6B", "#EE5A24", "#C0392B", "#E74C3C", "#FF7675",
];

export function KillersPieChart({ killers, mode, selectedKiller }: KillersPieChartProps) {
  const data = React.useMemo(() => {
    if (mode === "winloss" && selectedKiller) {
      return [
        { name: "Wins", value: selectedKiller.wins, imageUrl: selectedKiller.imageUrl, total: selectedKiller.wins },
        { name: "Losses", value: selectedKiller.losses, imageUrl: selectedKiller.imageUrl, total: selectedKiller.losses },
      ];
    }

    return killers
      .filter((k) => k.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)
      .map((k) => ({
        name: k.name,
        value: k.total,
        imageUrl: k.imageUrl,
        total: k.total,
      }));
  }, [killers, mode, selectedKiller]);

  const colors = mode === "winloss"
    ? ["#10B981", "#DC143C"]
    : BLOOD_PALETTE;

  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted">
        No match data yet. Register some wins or losses to see stats.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={120}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {data.map((_, index) => (
            <Cell
              key={index}
              fill={colors[index % colors.length]}
              opacity={0.9}
            />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ color: "#9ca3af", fontSize: "11px" }}>{value}</span>
          )}
          wrapperStyle={{ paddingTop: "16px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
