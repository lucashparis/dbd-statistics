import * as React from "react";
import { cn } from "@/lib/utils";

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Divider({ orientation = "horizontal", className }: DividerProps) {
  if (orientation === "vertical") {
    return <div className={cn("w-px self-stretch bg-subtle", className)} />;
  }
  return <div className={cn("h-px w-full bg-subtle", className)} />;
}
