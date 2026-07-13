import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamStreakCard } from "@/components/organisms/TeamStreakCard";
import type { TeamStreak } from "@/types/team";

const streak: TeamStreak = {
  team: { id: 1, name: "Os Horríveis", createdAt: "2024-01-01T00:00:00.000Z", members: [] },
  currentStreak: 2,
  bestStreak: 2,
  totalMatches: 2,
  wins: 1,
  losses: 1,
  winRate: 50,
  matches: [
    { id: 10, result: "win", createdAt: "2026-07-12T00:00:00.000Z", killer: { id: 1, name: "Blight", imageUrl: "" } },
    { id: 11, result: "loss", createdAt: "2026-07-12T00:00:00.000Z", killer: { id: 2, name: "Nurse", imageUrl: "" } },
  ],
};

async function openTimeline() {
  await userEvent.click(screen.getByRole("button", { name: /timeline/i }));
}

describe("TeamStreakCard", () => {
  it("renders no remove control when onDeleteMatch is absent", async () => {
    render(<TeamStreakCard streak={streak} />);
    await openTimeline();
    expect(screen.queryByRole("button", { name: /remove match against/i })).not.toBeInTheDocument();
  });

  it("confirms before calling onDeleteMatch with the match id", async () => {
    const onDeleteMatch = vi.fn();
    render(<TeamStreakCard streak={streak} onDeleteMatch={onDeleteMatch} />);
    await openTimeline();

    await userEvent.click(screen.getByRole("button", { name: "Remove match against Blight" }));
    expect(onDeleteMatch).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /confirm removing match against blight/i }));
    expect(onDeleteMatch).toHaveBeenCalledWith(10);
  });

  it("cancels the confirmation without deleting", async () => {
    const onDeleteMatch = vi.fn();
    render(<TeamStreakCard streak={streak} onDeleteMatch={onDeleteMatch} />);
    await openTimeline();

    await userEvent.click(screen.getByRole("button", { name: "Remove match against Blight" }));
    await userEvent.click(screen.getByRole("button", { name: /cancel removal/i }));
    expect(onDeleteMatch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Remove match against Blight" })).toBeInTheDocument();
  });

  it("shows a busy state for the match being deleted", async () => {
    render(<TeamStreakCard streak={streak} onDeleteMatch={vi.fn()} deletingId={10} />);
    await openTimeline();
    expect(screen.getByRole("button", { name: "Remove match against Blight" })).toBeDisabled();
  });
});
