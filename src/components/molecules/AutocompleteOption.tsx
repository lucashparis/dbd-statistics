import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { KillerStats } from "@/types/killer";

interface AutocompleteOptionProps {
  killer: KillerStats;
  highlighted?: boolean;
  onClick: (killer: KillerStats) => void;
  id?: string;
}

export function AutocompleteOption({ killer, highlighted = false, onClick, id }: AutocompleteOptionProps) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={highlighted}
      onClick={() => onClick(killer)}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 cursor-pointer",
        highlighted ? "bg-surface-3 text-white" : "text-gray-300 hover:bg-surface-2"
      )}
    >
      <div className="relative h-8 w-6 shrink-0 overflow-hidden rounded-sm border border-subtle">
        <Image
          src={killer.imageUrl}
          alt={killer.name}
          fill
          className="object-cover object-top"
          sizes="24px"
        />
      </div>
      <span className="truncate text-sm">{killer.name}</span>
    </li>
  );
}
