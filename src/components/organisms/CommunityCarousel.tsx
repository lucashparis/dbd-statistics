"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Skull, Ghost } from "lucide-react";
import { ProfileCard } from "@/components/molecules/ProfileCard";
import { cn } from "@/lib/utils";
import type { PublicProfileSummary } from "@/types/profile";
import type { Perspective } from "@/types/killer";

interface CommunityCarouselProps {
  profiles: PublicProfileSummary[];
  // Present only when killer mode is enabled — enables the perspective toggle.
  killerProfiles?: PublicProfileSummary[] | null;
}

const CARD_GAP = 16;
const ADVANCE_MS = 4000;

const OPTIONS: { value: Perspective; label: string; Icon: typeof Skull }[] = [
  { value: "survivor", label: "Surv", Icon: Ghost },
  { value: "killer", label: "Killer", Icon: Skull },
];

export function CommunityCarousel({ profiles, killerProfiles }: CommunityCarouselProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [paused, setPaused] = React.useState(false);
  const [perspective, setPerspective] = React.useState<Perspective>("survivor");

  const shown = perspective === "killer" && killerProfiles ? killerProfiles : profiles;

  function step(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const amount = (card?.offsetWidth ?? el.clientWidth) + CARD_GAP;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  React.useEffect(() => {
    if (paused) return;
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      const card = el.querySelector<HTMLElement>("[data-card]");
      el.scrollBy({ left: (card?.offsetWidth ?? el.clientWidth) + CARD_GAP, behavior: "smooth" });
    }, ADVANCE_MS);
    return () => clearInterval(id);
  }, [paused]);

  if (profiles.length === 0 && (!killerProfiles || killerProfiles.length === 0)) return null;

  return (
    <section
      aria-label="Community members"
      aria-roledescription="carousel"
      className="w-full max-w-screen-2xl px-4 sm:px-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xs uppercase tracking-[0.3em] text-muted">
            From the Fog · Community
          </h2>
          {killerProfiles && (
            <div
              role="group"
              aria-label="Play perspective"
              className="inline-flex rounded-lg border border-subtle bg-surface-2 p-0.5"
            >
              {OPTIONS.map(({ value, label, Icon }) => {
                const isActive = value === perspective;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setPerspective(value)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all duration-200 cursor-pointer",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood/60",
                      isActive ? "bg-blood text-white" : "text-muted hover:text-white"
                    )}
                  >
                    <Icon size={13} aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous members"
            className="rounded-md border border-subtle p-1.5 text-muted transition-colors hover:border-blood hover:text-blood focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood/60"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next members"
            className="rounded-md border border-subtle p-1.5 text-muted transition-colors hover:border-blood hover:text-blood focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood/60"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="-m-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-dark p-4"
      >
        {shown.map((profile) => (
          <div
            key={profile.userId}
            data-card
            className="w-[280px] shrink-0 snap-start sm:w-[300px]"
          >
            <ProfileCard profile={profile} variant="channel" />
          </div>
        ))}
      </div>
    </section>
  );
}
