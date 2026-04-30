import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Match } from "@/types/killer";

interface MatchItemProps {
  match: Match;
  index: number;
}

export function MatchItem({ match, index }: MatchItemProps) {
  const isWin = match.result === "win";
  const date = new Date(match.createdAt);
  const formatted = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li
      className="flex items-center gap-4 px-4 py-3 rounded-lg bg-surface border border-subtle animate-[fadeInUp_0.3s_ease_both]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden border border-subtle">
        <Image
          src={match.killer.imageUrl}
          alt={match.killer.name}
          fill
          className="object-cover object-top"
          sizes="40px"
        />
      </div>

      <span className="flex-1 text-sm font-medium text-white truncate">
        {match.killer.name}
      </span>

      <time
        dateTime={match.createdAt}
        className="hidden text-xs text-muted sm:block shrink-0"
      >
        {formatted}
      </time>

      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold border",
          isWin
            ? "bg-emerald-700/20 text-emerald-400 border-emerald-700/40"
            : "bg-blood/10 text-blood border-blood/30"
        )}
      >
        {isWin ? "Victory" : "Defeat"}
      </span>
    </li>
  );
}
