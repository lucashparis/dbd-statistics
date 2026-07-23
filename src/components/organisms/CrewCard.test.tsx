import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CrewCard } from "@/components/organisms/CrewCard";
import type { Crew } from "@/types/crew";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

function crew(over: Partial<Crew> = {}): Crew {
  return {
    id: 1,
    name: "Alpha",
    writePolicy: "allMembers",
    ownerId: "u1",
    isOwner: true,
    isReady: true,
    canWrite: true,
    members: [
      { userId: "u1", name: "Léo", nick: "leo", imageUrl: null, status: "accepted", isOwner: true },
      { userId: "u2", name: "Ro", nick: "ro", imageUrl: null, status: "pending", isOwner: false },
    ],
    currentStreak: 3,
    bestStreak: 5,
    totalMatches: 4,
    wins: 3,
    losses: 1,
    winRate: 75,
    matches: [
      {
        id: 10,
        result: "win",
        createdAt: "2024-01-01T00:00:00.000Z",
        killer: { id: 9, name: "Nurse", imageUrl: "" },
        loggedBy: { userId: "u1", name: "Léo", nick: "leo" },
      },
    ],
    ...over,
  };
}

describe("CrewCard", () => {
  it("shows each member with a status badge", () => {
    render(<CrewCard crew={crew()} />);
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("warns when the crew is not ready", () => {
    render(<CrewCard crew={crew({ isReady: false })} />);
    expect(screen.getByText(/Waiting for all members/i)).toBeInTheDocument();
  });

  it("shows owner controls and removes a member", async () => {
    const onRemoveMember = vi.fn();
    render(<CrewCard crew={crew()} onRemoveMember={onRemoveMember} onDeleteCrew={vi.fn()} onSetPolicy={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove ro from the crew/i }));
    expect(onRemoveMember).toHaveBeenCalledWith(1, "u2");
  });

  it("confirms before deleting a match", async () => {
    const onDeleteMatch = vi.fn();
    render(<CrewCard crew={crew()} onDeleteMatch={onDeleteMatch} />);
    await userEvent.click(screen.getByRole("button", { name: /Timeline/i }));
    await userEvent.click(screen.getByRole("button", { name: /Remove match against Nurse/i }));
    await userEvent.click(screen.getByRole("button", { name: /Confirm removing match/i }));
    expect(onDeleteMatch).toHaveBeenCalledWith(1, 10);
  });
});
