import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface KillerImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  overlay?: boolean;
}

export function KillerImage({
  src,
  alt,
  className,
  priority = false,
  overlay = true,
}: KillerImageProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-top"
        priority={priority}
        sizes="(max-width: 768px) 50vw, 25vw"
        unoptimized
      />
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/30 to-transparent" />
      )}
    </div>
  );
}
