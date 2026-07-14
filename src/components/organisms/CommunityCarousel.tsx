"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProfileCard } from "@/components/molecules/ProfileCard";
import type { PublicProfileSummary } from "@/types/profile";

interface CommunityCarouselProps {
  profiles: PublicProfileSummary[];
}

const CARD_GAP = 16;
const ADVANCE_MS = 4000;

export function CommunityCarousel({ profiles }: CommunityCarouselProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [paused, setPaused] = React.useState(false);

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

  if (profiles.length === 0) return null;

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
        <h2 className="font-display text-xs uppercase tracking-[0.3em] text-muted">
          From the Fog · Community
        </h2>
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
        {profiles.map((profile) => (
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
