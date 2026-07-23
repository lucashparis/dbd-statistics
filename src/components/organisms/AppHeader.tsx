import * as React from "react";
import { Skull } from "lucide-react";
import { UserMenu } from "@/components/organisms/UserMenu";
import { InviteBell } from "@/components/organisms/InviteBell";
import { crewsEnabled } from "@/lib/flags";

export function AppHeader({ headerExtra }: { headerExtra?: React.ReactNode }) {
  return (
    <header className="border-b border-subtle bg-surface/80 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blood/40 bg-blood/10 glow-blood">
              <Skull size={22} className="text-blood" />
            </div>
            <div className="min-w-0">
              <h1
                className="truncate text-lg font-bold uppercase tracking-[0.15em] text-white sm:text-xl"
                style={{ fontFamily: "var(--font-cinzel), serif" }}
              >
                DBD Killer
              </h1>
              <p className="hidden truncate text-[10px] uppercase tracking-widest text-muted sm:block">
                Dead by Daylight · Statistics
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {headerExtra}
            {crewsEnabled && <InviteBell />}
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
