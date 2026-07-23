import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CrewLaunchForm } from "@/components/organisms/CrewLaunchForm";
import type { Crew } from "@/types/crew";
import type { KillerStats } from "@/types/killer";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const killer = (id: number, name: string): KillerStats => ({
  id,
  name,
  imageUrl: `https://example.com/${name}.png`,
  wins: 0,
  losses: 0,
  total: 0,
  winRate: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
});
const killers = [killer(9, "Nurse")];

function crew(over: Partial<Crew>): Crew {
  return {
    id: 1,
    name: "Alpha",
    writePolicy: "allMembers",
    ownerId: "u1",
    isOwner: true,
    isReady: true,
    canWrite: true,
    members: [],
    currentStreak: 0,
    bestStreak: 0,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    matches: [],
    ...over,
  };
}

async function pickKiller(name: string) {
  await userEvent.type(screen.getByLabelText("Killer faced"), name);
  await userEvent.click(screen.getByRole("option", { name: new RegExp(name, "i") }));
}

describe("CrewLaunchForm", () => {
  it("shows the empty state when no crew is writable", () => {
    render(<CrewLaunchForm crews={[crew({ canWrite: false })]} killers={killers} launching={false} onLaunch={vi.fn()} />);
    expect(screen.getByText(/No crew is ready/i)).toBeInTheDocument();
  });

  it("only lists crews the viewer can write to", () => {
    render(
      <CrewLaunchForm
        crews={[crew({ id: 1, name: "Writable", canWrite: true }), crew({ id: 2, name: "Locked", canWrite: false })]}
        killers={killers}
        launching={false}
        onLaunch={vi.fn()}
      />
    );
    expect(screen.getByRole("option", { name: "Writable" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Locked" })).not.toBeInTheDocument();
  });

  it("launches a win with the selected crew and killer", async () => {
    const onLaunch = vi.fn().mockResolvedValue(true);
    render(<CrewLaunchForm crews={[crew({ canWrite: true })]} killers={killers} launching={false} onLaunch={onLaunch} />);
    await userEvent.selectOptions(screen.getByLabelText("Crew"), "1");
    await pickKiller("Nurse");
    await userEvent.click(screen.getByRole("button", { name: /log match/i }));
    expect(onLaunch).toHaveBeenCalledWith(1, 9, "win");
  });
});
