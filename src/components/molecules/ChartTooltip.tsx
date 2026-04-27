import * as React from "react";
import Image from "next/image";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { name: string; imageUrl: string; total: number } }>;
}

export function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-subtle bg-surface-2 p-3 shadow-xl">
      <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded-sm border border-subtle">
        <Image
          src={data.imageUrl}
          alt={data.name}
          fill
          className="object-cover object-top"
          sizes="28px"
          unoptimized
        />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{data.name}</p>
        <p className="text-xs text-muted">{data.total} matches</p>
      </div>
    </div>
  );
}
