import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KillerGrid } from "@/components/organisms/KillerGrid";
import type { KillerStats } from "@/types/killer";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

function makeKiller(id: number, name: string): KillerStats {
  return {
    id,
    name,
    imageUrl: `https://example.com/${name.toLowerCase()}.png`,
    wins: 0,
    losses: 0,
    total: 0,
    winRate: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

const baseProps = {
  loadingWin: null,
  loadingLoss: null,
  loadingUndoWin: null,
  loadingUndoLoss: null,
  onWin: vi.fn(),
  onLoss: vi.fn(),
  onUndoWin: vi.fn(),
  onUndoLoss: vi.fn(),
};

describe("KillerGrid", () => {
  it("shows empty state when killers array is empty", () => {
    render(<KillerGrid killers={[]} {...baseProps} />);
    expect(screen.getByText("No killers found")).toBeInTheDocument();
  });

  it("renders a card for each killer", () => {
    const killers = [makeKiller(1, "Trapper"), makeKiller(2, "Wraith")];
    render(<KillerGrid killers={killers} {...baseProps} />);
    expect(screen.getByText("Trapper")).toBeInTheDocument();
    expect(screen.getByText("Wraith")).toBeInTheDocument();
  });

  it("renders the correct number of cards", () => {
    const killers = [
      makeKiller(1, "Trapper"),
      makeKiller(2, "Wraith"),
      makeKiller(3, "Hillbilly"),
    ];
    render(<KillerGrid killers={killers} {...baseProps} />);
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });
});
