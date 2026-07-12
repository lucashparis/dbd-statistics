import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { KillerDetailPanel } from "./KillerDetailPanel";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));
import type { KillerStats } from "@/types/killer";

const killer: KillerStats = {
  id: 1,
  name: "Trapper",
  imageUrl: "",
  wins: 6,
  losses: 4,
  total: 10,
  winRate: 60,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("KillerDetailPanel", () => {
  it("renders the per-killer streak labels", () => {
    render(<KillerDetailPanel killer={killer} />);
    expect(screen.getByText("Win Run")).toBeInTheDocument();
    expect(screen.getByText("Loss Run")).toBeInTheDocument();
  });

  it("displays the provided streak values", () => {
    render(<KillerDetailPanel killer={killer} longestWinStreak={7} longestLossStreak={3} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("defaults streak values to zero", () => {
    render(<KillerDetailPanel killer={killer} />);
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
  });
});
