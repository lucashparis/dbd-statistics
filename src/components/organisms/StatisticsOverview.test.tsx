import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatisticsOverview } from "@/components/organisms/StatisticsOverview";
import type { KillerStats } from "@/types/killer";

vi.mock("@/components/organisms/KillersPieChart", () => ({
  KillersPieChart: () => <div data-testid="pie-chart" />,
}));

function makeKiller(
  id: number,
  name: string,
  wins: number,
  losses: number
): KillerStats {
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
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

const killers: KillerStats[] = [
  makeKiller(1, "Trapper", 6, 4),
  makeKiller(2, "Wraith", 3, 7),
];

describe("StatisticsOverview", () => {
  it("renders the pie chart", () => {
    render(<StatisticsOverview killers={killers} selectedKiller={null} />);
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("displays aggregated total wins across all killers", () => {
    render(<StatisticsOverview killers={killers} selectedKiller={null} />);
    expect(screen.getByText("9")).toBeInTheDocument(); // 6 + 3
  });

  it("displays aggregated total losses across all killers", () => {
    render(<StatisticsOverview killers={killers} selectedKiller={null} />);
    expect(screen.getByText("11")).toBeInTheDocument(); // 4 + 7
  });

  it("displays aggregated total matches", () => {
    render(<StatisticsOverview killers={killers} selectedKiller={null} />);
    expect(screen.getByText("20")).toBeInTheDocument(); // 10 + 10
  });

  it("shows only selected killer stats when selectedKiller is provided", () => {
    render(
      <StatisticsOverview killers={killers} selectedKiller={killers[0]} />
    );
    expect(screen.getByText("6")).toBeInTheDocument(); // Trapper wins
    expect(screen.getByText("4")).toBeInTheDocument(); // Trapper losses
  });

  it("shows section labels for stats", () => {
    render(<StatisticsOverview killers={killers} selectedKiller={null} />);
    expect(screen.getByText("Total Wins")).toBeInTheDocument();
    expect(screen.getByText("Total Losses")).toBeInTheDocument();
    expect(screen.getByText("Total Matches")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
  });
});
