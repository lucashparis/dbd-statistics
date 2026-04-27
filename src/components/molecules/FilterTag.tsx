"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Tag } from "@/components/atoms/Tag";

interface FilterTagProps {
  label: string;
  onRemove: () => void;
}

export function FilterTag({ label, onRemove }: FilterTagProps) {
  return (
    <Tag>
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-blood/20 transition-colors"
        aria-label={`Remove filter: ${label}`}
      >
        <X size={10} />
      </button>
    </Tag>
  );
}
