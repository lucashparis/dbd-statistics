"use client";

import * as React from "react";
import { AppShell } from "@/components/templates/AppShell";
import { KillersTabTemplate } from "@/components/templates/KillersTabTemplate";
import { StatisticsTabTemplate } from "@/components/templates/StatisticsTabTemplate";
import { useKillers } from "@/hooks/useKillers";
import type { KillerStats } from "@/types/killer";

interface KillersPageClientProps {
  initialKillers: KillerStats[];
}

export function KillersPageClient({ initialKillers }: KillersPageClientProps) {
  const { killers, loadingWin, loadingLoss, registerWin, registerLoss } =
    useKillers(initialKillers);

  return (
    <AppShell
      killersContent={
        <KillersTabTemplate
          killers={killers}
          loadingWin={loadingWin}
          loadingLoss={loadingLoss}
          onWin={registerWin}
          onLoss={registerLoss}
        />
      }
      statisticsContent={<StatisticsTabTemplate killers={killers} />}
    />
  );
}
