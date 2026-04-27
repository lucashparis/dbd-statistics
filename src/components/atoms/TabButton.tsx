"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: React.ReactNode;
}

export function TabButton({ active = false, children, className, ...props }: TabButtonProps) {
  return (
    <button
      role="tab"
      aria-selected={active}
      className={cn(
        "relative px-5 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood/60 rounded-t-md",
        active
          ? "text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blood after:rounded-full after:shadow-[0_0_8px_rgba(220,20,60,0.8)]"
          : "text-muted hover:text-gray-300",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
