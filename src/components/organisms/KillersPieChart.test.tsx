import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { KillersPieChart } from "./KillersPieChart";
import type { KillerStats } from "@/types/killer";

const mockKillers: KillerStats[] = [
  {
    id: 1,
    name: "Trapper",
    imageUrl: "",
    wins: 5,
    losses: 3,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    total: 8,
    winRate: 62.5,
  },
  {
    id: 2,
    name: "Wraith",
    imageUrl: "",
    wins: 2,
    losses: 7,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    total: 9,
    winRate: 22.2,
  },
];

beforeEach(() => {
  global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn().mockImplementation((_el: Element) => {
      callback([{ contentRect: { width: 600 } }], {} as ResizeObserver);
    }),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

describe("KillersPieChart", () => {
  it("renders chart container for appearances mode", () => {
    const { container } = render(
      <KillersPieChart killers={mockKillers} mode="appearances" />
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders empty state when no killers have matches", () => {
    const noMatchKillers = mockKillers.map((k) => ({
      ...k,
      wins: 0,
      losses: 0,
      total: 0,
      winRate: 0,
    }));
    render(<KillersPieChart killers={noMatchKillers} mode="appearances" />);
    expect(screen.getByText(/no match data yet/i)).toBeTruthy();
  });

  it("renders winloss legend labels for selected killer", () => {
    render(
      <KillersPieChart
        killers={mockKillers}
        mode="winloss"
        selectedKiller={mockKillers[0]}
      />
    );
    expect(screen.getByText("Wins")).toBeTruthy();
    expect(screen.getByText("Losses")).toBeTruthy();
  });

  it("renders killer names in appearances legend", () => {
    render(<KillersPieChart killers={mockKillers} mode="appearances" />);
    expect(screen.getByText("Trapper")).toBeTruthy();
    expect(screen.getByText("Wraith")).toBeTruthy();
  });

  it("renders empty state in winloss mode when no match data", () => {
    const emptyKiller: KillerStats = {
      ...mockKillers[0],
      wins: 0,
      losses: 0,
      total: 0,
      winRate: 0,
    };
    render(
      <KillersPieChart
        killers={[emptyKiller]}
        mode="winloss"
        selectedKiller={emptyKiller}
      />
    );
    expect(screen.getByText(/no match data yet/i)).toBeTruthy();
  });

  it("exposes the chart as an image with a textual data summary", () => {
    render(<KillersPieChart killers={mockKillers} mode="appearances" />);
    const chart = screen.getByRole("img", { name: /match distribution/i });
    expect(chart.getAttribute("aria-label")).toContain("Trapper 8");
    expect(chart.getAttribute("aria-label")).toContain("Wraith 9");
  });

  it("labels the win/loss chart with its wins and losses", () => {
    render(
      <KillersPieChart
        killers={mockKillers}
        mode="winloss"
        selectedKiller={mockKillers[0]}
      />
    );
    expect(
      screen.getByRole("img", { name: /win\/loss distribution for trapper/i })
    ).toBeTruthy();
  });

  it("aggregates killers beyond the palette into an 'Other' slice", () => {
    const many: KillerStats[] = Array.from({ length: 10 }, (_, i) => ({
      ...mockKillers[0],
      id: i + 1,
      name: `Killer ${i + 1}`,
      total: 20 - i,
      wins: 20 - i,
      losses: 0,
    }));
    render(<KillersPieChart killers={many} mode="appearances" />);

    expect(screen.getByText("Other")).toBeTruthy();
    expect(screen.getByText("Killer 1")).toBeTruthy();
    expect(screen.queryByText("Killer 9")).toBeNull();
    expect(screen.queryByText("Killer 10")).toBeNull();
  });
});
