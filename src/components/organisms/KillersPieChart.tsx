"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
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
  const [containerWidth, setContainerWidth] = useState(600);

  const containerRef = (node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(node);
    return () => ro.disconnect();
  };

  const outerRadius = Math.min(120, Math.floor(containerWidth * 0.38));
  const innerRadius = Math.min(70, Math.floor(containerWidth * 0.23));

  const data = mode === "winloss" && selectedKiller
    ? [
        { name: "Wins", value: selectedKiller.wins, imageUrl: selectedKiller.imageUrl, total: selectedKiller.wins },
        { name: "Losses", value: selectedKiller.losses, imageUrl: selectedKiller.imageUrl, total: selectedKiller.losses },
      ]
    : killers
        .filter((k) => k.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 15)
        .map((k) => ({
          name: k.name,
          value: k.total,
          imageUrl: k.imageUrl,
          total: k.total,
        }));

  const colors = mode === "winloss"
    ? ["#10B981", "#DC143C"]
    : BLOOD_PALETTE;

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted">
        No match data yet. Register some wins or losses to see stats.
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
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
        </PieChart>
      </ResponsiveContainer>

      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 pt-4">
        {data.map((entry, index) => (
          <li key={entry.name} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span style={{ color: "#9ca3af", fontSize: "11px" }}>{entry.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
