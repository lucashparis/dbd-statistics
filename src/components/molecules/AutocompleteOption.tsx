import Image from "next/image";
import { cn } from "@/lib/utils";
import type { AutocompleteItem } from "@/hooks/useAutocomplete";

interface AutocompleteOptionProps<T extends AutocompleteItem> {
  item: T;
  highlighted?: boolean;
  onClick: (item: T) => void;
  id?: string;
}

export function AutocompleteOption<T extends AutocompleteItem>({
  item,
  highlighted = false,
  onClick,
  id,
}: AutocompleteOptionProps<T>) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={highlighted}
      onClick={() => onClick(item)}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 cursor-pointer",
        highlighted ? "bg-surface-3 text-white" : "text-gray-300 hover:bg-surface-2"
      )}
    >
      <div className="relative h-8 w-6 shrink-0 overflow-hidden rounded-sm border border-subtle">
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          className="object-cover object-top"
          sizes="24px"
        />
      </div>
      <span className="truncate text-sm">{item.name}</span>
    </li>
  );
}
