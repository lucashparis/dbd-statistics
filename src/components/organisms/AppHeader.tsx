import * as React from "react";
import { Skull } from "lucide-react";

export function AppHeader() {
  return (
    <header className="border-b border-subtle bg-surface/80 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blood/40 bg-blood/10 glow-blood">
            <Skull size={22} className="text-blood" />
          </div>
          <div>
            <h1
              className="text-xl font-bold uppercase tracking-[0.15em] text-white"
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              DBD Killer
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-muted">
              Dead by Daylight · Statistics
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
