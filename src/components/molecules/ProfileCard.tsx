import * as React from "react";
import Link from "next/link";
import { Avatar } from "@/components/atoms/Avatar";
import { cn } from "@/lib/utils";
import type { PublicProfileSummary } from "@/types/profile";

interface ProfileCardProps {
  profile: PublicProfileSummary;
  variant: "channel" | "internal";
  className?: string;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-surface-2 px-2 py-2">
      <p className="font-display text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted">{label}</p>
    </div>
  );
}

function CardBody({ profile }: { profile: PublicProfileSummary }) {
  const displayName = profile.name?.trim() || profile.nick;
  return (
    <>
      <div className="flex items-center gap-3">
        <Avatar imageUrl={profile.mainKiller?.imageUrl} label={displayName} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold text-white">{displayName}</p>
          <p className="truncate text-xs text-muted">@{profile.nick}</p>
          {profile.mainKiller && (
            <p className="mt-0.5 truncate text-[11px] uppercase tracking-wide text-blood">
              {profile.mainKiller.name}
            </p>
          )}
          {profile.mainSurv && (
            <p className="truncate text-[11px] uppercase tracking-wide text-muted">
              Surv · {profile.mainSurv.name}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Matches" value={profile.stats.total} />
        <Stat label="Wins" value={profile.stats.wins} />
        <Stat label="Win rate" value={`${profile.stats.winRate}%`} />
      </div>
    </>
  );
}

const cardClasses = "card-dark card-hover block w-full p-5 text-left";

export function ProfileCard({ profile, variant, className }: ProfileCardProps) {
  const displayName = profile.name?.trim() || profile.nick;

  if (variant === "internal") {
    return (
      <Link
        href={`/community/${profile.userId}`}
        aria-label={`View ${displayName}'s statistics`}
        className={cn(cardClasses, className)}
      >
        <CardBody profile={profile} />
      </Link>
    );
  }

  if (profile.channelUrl) {
    return (
      <a
        href={profile.channelUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${displayName}'s channel`}
        className={cn(cardClasses, className)}
      >
        <CardBody profile={profile} />
      </a>
    );
  }

  return (
    <div className={cn(cardClasses, "cursor-default", className)}>
      <CardBody profile={profile} />
    </div>
  );
}
