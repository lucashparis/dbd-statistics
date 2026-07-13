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

const CATEGORICAL = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
  "var(--color-chart-7)",
  "var(--color-chart-8)",
];
const OTHER_COLOR = "var(--color-chart-other)";

interface Slice {
  name: string;
  value: number;
  imageUrl: string;
  total: number;
  isOther?: boolean;
}

function buildAppearances(killers: KillerStats[]): Slice[] {
  const ranked = killers
    .filter((k) => k.total > 0)
    .sort((a, b) => b.total - a.total);

  if (ranked.length <= CATEGORICAL.length) {
    return ranked.map((k) => ({
      name: k.name,
      value: k.total,
      imageUrl: k.imageUrl,
      total: k.total,
    }));
  }

  const top = ranked.slice(0, CATEGORICAL.length - 1);
  const rest = ranked.slice(CATEGORICAL.length - 1);
  const otherTotal = rest.reduce((sum, k) => sum + k.total, 0);

  return [
    ...top.map((k) => ({
      name: k.name,
      value: k.total,
      imageUrl: k.imageUrl,
      total: k.total,
    })),
    { name: "Other", value: otherTotal, imageUrl: "", total: otherTotal, isOther: true },
  ];
}

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

  const data: Slice[] = mode === "winloss" && selectedKiller
    ? [
        { name: "Wins", value: selectedKiller.wins, imageUrl: selectedKiller.imageUrl, total: selectedKiller.wins },
        { name: "Losses", value: selectedKiller.losses, imageUrl: selectedKiller.imageUrl, total: selectedKiller.losses },
      ]
    : buildAppearances(killers);

  const colors = mode === "winloss" && selectedKiller
    ? ["var(--color-win)", "var(--color-blood)"]
    : data.map((d, i) => (d.isOther ? OTHER_COLOR : CATEGORICAL[i]));

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted">
        No match data yet. Register some wins or losses to see stats.
      </div>
    );
  }

  const chartLabel = mode === "winloss" && selectedKiller
    ? `Win/loss distribution for ${selectedKiller.name}: ${selectedKiller.wins} wins, ${selectedKiller.losses} losses.`
    : `Match distribution across ${data.length} ${data.length === 1 ? "killer" : "killers"}: ${data.map((d) => `${d.name} ${d.value}`).join(", ")}.`;

  return (
    <div ref={containerRef}>
      <div role="img" aria-label={chartLabel}>
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
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={colors[index]}
                  opacity={0.9}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 pt-4">
        {data.map((entry, index) => (
          <li key={entry.name} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colors[index] }}
            />
            <span className="text-[11px] text-muted">{entry.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
