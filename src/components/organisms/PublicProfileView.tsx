import * as React from "react";
import { Avatar } from "@/components/atoms/Avatar";
import { ChannelLinkButton } from "@/components/molecules/ChannelLinkButton";
import { StatisticsOverview } from "@/components/organisms/StatisticsOverview";
import type { PublicProfileDetail } from "@/types/profile";

interface PublicProfileViewProps {
  profile: PublicProfileDetail;
}

export function PublicProfileView({ profile }: PublicProfileViewProps) {
  const displayName = profile.name?.trim() || profile.nick;

  return (
    <div className="space-y-8">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <Avatar imageUrl={profile.mainKiller?.imageUrl} label={displayName} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-bold text-white">{displayName}</h1>
          <p className="text-sm text-muted">@{profile.nick}</p>
          {profile.mainKiller && (
            <p className="mt-1 text-xs uppercase tracking-widest text-blood">
              Main · {profile.mainKiller.name}
            </p>
          )}
          {profile.mainSurv && (
            <p className="mt-1 text-xs uppercase tracking-widest text-muted">
              Surv · {profile.mainSurv.name}
            </p>
          )}
        </div>
        <ChannelLinkButton channelUrl={profile.channelUrl} />
      </header>

      <StatisticsOverview killers={profile.killers} selectedKiller={null} streaks={profile.streaks} />
    </div>
  );
}
