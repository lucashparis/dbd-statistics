"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "win" | "loss" | "default" | "ghost" | "primary";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  win: [
    "bg-emerald-700 text-white border border-emerald-600",
    "hover:bg-emerald-600 hover:shadow-[0_0_12px_rgba(16,185,129,0.4)]",
    "active:scale-95",
  ].join(" "),
  loss: [
    "bg-blood/20 text-blood border border-blood/50",
    "hover:bg-blood hover:text-white hover:shadow-[0_0_12px_rgba(220,20,60,0.4)]",
    "active:scale-95",
  ].join(" "),
  default: [
    "bg-surface-2 text-gray-300 border border-subtle",
    "hover:border-blood/50 hover:text-white",
    "active:scale-95",
  ].join(" "),
  ghost: [
    "bg-transparent text-gray-400 border border-transparent",
    "hover:bg-surface-2 hover:text-white",
    "active:scale-95",
  ].join(" "),
  primary: [
    "bg-blood text-white border border-blood",
    "hover:bg-blood-dark hover:glow-blood",
    "active:scale-95",
  ].join(" "),
};

export function Button({
  variant = "default",
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium",
        "transition-all duration-200 cursor-pointer select-none",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood/60",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : null}
      {children}
    </button>
  );
}
