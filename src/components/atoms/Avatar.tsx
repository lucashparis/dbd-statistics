import * as React from "react";
import Image from "next/image";
import { Skull } from "lucide-react";
import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  imageUrl?: string | null;
  label: string;
  size?: AvatarSize;
  className?: string;
}

const sizeMap: Record<AvatarSize, { box: string; px: number; text: string; icon: number }> = {
  sm: { box: "h-8 w-8", px: 32, text: "text-xs", icon: 16 },
  md: { box: "h-10 w-10", px: 40, text: "text-sm", icon: 18 },
  lg: { box: "h-20 w-20", px: 80, text: "text-2xl", icon: 32 },
};

export function Avatar({ imageUrl, label, size = "md", className }: AvatarProps) {
  const s = sizeMap[size];
  const initial = label.trim().charAt(0).toUpperCase();

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-subtle bg-surface-2",
        s.box,
        className
      )}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={label || "Avatar"}
          fill
          className="object-cover object-top"
          sizes={`${s.px}px`}
        />
      ) : initial ? (
        <span className={cn("font-display font-semibold text-muted", s.text)}>{initial}</span>
      ) : (
        <Skull size={s.icon} className="text-muted" aria-hidden />
      )}
    </span>
  );
}
