import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { KillerRankingList } from "./KillerRankingList";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));
import type { KillerStats } from "@/types/killer";

function makeKiller(id: number, name: string, wins: number, losses: number): KillerStats {
  const total = wins + losses;
  const winRate = total === 0 ? 0 : Math.round((wins / total) * 100);
  return {
    id,
    name,
    imageUrl: "",
    wins,
    losses,
    total,
    winRate,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

const FEW_KILLERS = [
  makeKiller(1, "Trapper", 5, 3),
  makeKiller(2, "Wraith", 2, 7),
  makeKiller(3, "Hillbilly", 10, 2),
];

const MANY_KILLERS = Array.from({ length: 15 }, (_, i) =>
  makeKiller(i + 1, `Killer ${i + 1}`, i + 1, i)
);

describe("KillerRankingList", () => {
  it("shows empty state when no killers have matches", () => {
    const empty = FEW_KILLERS.map((k) => ({ ...k, wins: 0, losses: 0, total: 0, winRate: 0 }));
    render(<KillerRankingList killers={empty} />);
    expect(screen.getByText(/no match data yet/i)).toBeTruthy();
  });

  it("renders killers sorted by total matches descending", () => {
    render(<KillerRankingList killers={FEW_KILLERS} />);
    const items = screen.getAllByRole("listitem");
    // Hillbilly(12) > Wraith(9) > Trapper(8)
    expect(items[0]).toHaveTextContent("Hillbilly");
    expect(items[1]).toHaveTextContent("Wraith");
    expect(items[2]).toHaveTextContent("Trapper");
  });

  it("displays rank numbers starting at 1", () => {
    const { container } = render(<KillerRankingList killers={FEW_KILLERS} />);
    const rankSpans = container.querySelectorAll("span.font-mono");
    const ranks = Array.from(rankSpans).map((s) => s.textContent?.trim());
    expect(ranks).toEqual(["1", "2", "3"]);
  });

  it("shows killer name, wins, losses, total and win rate", () => {
    render(<KillerRankingList killers={[makeKiller(1, "Trapper", 5, 3)]} />);
    expect(screen.getByText("Trapper")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("63%")).toBeTruthy();
  });

  it("does not show 'Show all' button when killers count is at or below 10", () => {
    render(<KillerRankingList killers={FEW_KILLERS} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows only top 10 by default when more than 10 killers have matches", () => {
    render(<KillerRankingList killers={MANY_KILLERS} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByRole("button", { name: /show all/i })).toBeTruthy();
  });

  it("expands to all killers when 'Show all' is clicked", async () => {
    render(<KillerRankingList killers={MANY_KILLERS} />);
    await userEvent.click(screen.getByRole("button", { name: /show all/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(15);
    expect(screen.getByRole("button", { name: /show top 10/i })).toBeTruthy();
  });

  it("collapses back to top 10 when 'Show top 10' is clicked", async () => {
    render(<KillerRankingList killers={MANY_KILLERS} />);
    await userEvent.click(screen.getByRole("button", { name: /show all/i }));
    await userEvent.click(screen.getByRole("button", { name: /show top 10/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });

  it("excludes killers with zero matches from the list", () => {
    const mixed = [
      makeKiller(1, "Trapper", 5, 3),
      makeKiller(2, "Idle Killer", 0, 0),
    ];
    render(<KillerRankingList killers={mixed} />);
    expect(screen.queryByText("Idle Killer")).toBeNull();
    expect(screen.getByText("Trapper")).toBeTruthy();
  });
});
