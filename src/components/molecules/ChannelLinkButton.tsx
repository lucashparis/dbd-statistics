import * as React from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelLinkButtonProps {
  channelUrl: string | null;
  className?: string;
}

export function ChannelLinkButton({ channelUrl, className }: ChannelLinkButtonProps) {
  if (!channelUrl) return null;

  return (
    <a
      href={channelUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-md bg-blood px-4 py-2 text-sm font-semibold text-white transition-colors",
        "hover:bg-blood-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood/60",
        className
      )}
    >
      <ExternalLink size={16} aria-hidden />
      Visit channel
    </a>
  );
}
