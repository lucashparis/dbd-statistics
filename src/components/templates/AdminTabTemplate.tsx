"use client";

import * as React from "react";
import { useAdminBans } from "@/hooks/useAdminBans";
import { BanListManager } from "@/components/organisms/BanListManager";

export function AdminTabTemplate({ isActive }: { isActive: boolean }) {
  const { bans, loading, error, banning, liftingId, ban, liftBan } = useAdminBans(isActive);

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-muted">Moderation</p>
        <h2 className="glow-blood-text font-display text-3xl font-bold uppercase tracking-widest text-white sm:text-4xl">
          Ban list
        </h2>
        <p className="text-sm tracking-widest text-muted">
          Banned players cannot log matches or host a crew — only the crew matches their teammates
          log still count for them.
        </p>
      </header>

      <BanListManager
        bans={bans}
        loading={loading}
        error={error}
        banning={banning}
        liftingId={liftingId}
        onBan={ban}
        onLift={liftBan}
      />
    </div>
  );
}
