import { describe, it, expect } from "vitest";
import { aggregateStats, computeStats, computeStreaks, computeWinRate, formatPercent } from "@/lib/utils";
import type { Killer } from "@/types/killer";

const base: Killer = {
  id: 1,
  name: "Trapper",
  imageUrl: "https://example.com/trapper.png",
  wins: 0,
  losses: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("computeStats", () => {
  it("returns total 0 and winRate 0 when no games played", () => {
    const stats = computeStats({ ...base, wins: 0, losses: 0 });
    expect(stats.total).toBe(0);
    expect(stats.winRate).toBe(0);
  });

  it("computes correct total and winRate for normal games", () => {
    const stats = computeStats({ ...base, wins: 3, losses: 1 });
    expect(stats.total).toBe(4);
    expect(stats.winRate).toBe(75);
  });

  it("returns winRate 100 when all games are wins", () => {
    const stats = computeStats({ ...base, wins: 5, losses: 0 });
    expect(stats.total).toBe(5);
    expect(stats.winRate).toBe(100);
  });
});

describe("computeWinRate", () => {
  it("returns 0 when no games played", () => {
    expect(computeWinRate(0, 0)).toBe(0);
  });

  it("rounds to the nearest whole percent", () => {
    expect(computeWinRate(1, 2)).toBe(33);
    expect(computeWinRate(2, 1)).toBe(67);
  });

  it("returns 100 when all games are wins", () => {
    expect(computeWinRate(5, 0)).toBe(100);
  });
});

describe("aggregateStats", () => {
  it("returns zeroed totals for an empty list", () => {
    expect(aggregateStats([])).toEqual({ wins: 0, losses: 0, total: 0, winRate: 0 });
  });

  it("sums wins and losses across killers and derives the win rate", () => {
    const totals = aggregateStats([
      { wins: 3, losses: 1 },
      { wins: 1, losses: 3 },
    ]);
    expect(totals).toEqual({ wins: 4, losses: 4, total: 8, winRate: 50 });
  });

  it("matches computeWinRate's formula so the two never drift", () => {
    const killers = [{ wins: 7, losses: 5 }, { wins: 2, losses: 4 }];
    const totals = aggregateStats(killers);
    expect(totals.winRate).toBe(computeWinRate(totals.wins, totals.losses));
  });
});

describe("computeStreaks", () => {
  it("returns zero streaks for an empty history", () => {
    expect(computeStreaks([])).toEqual({ longestWin: 0, longestLoss: 0 });
  });

  it("finds the longest win streak", () => {
    const results = ["win", "win", "loss", "win", "win", "win", "loss"] as const;
    expect(computeStreaks([...results]).longestWin).toBe(3);
  });

  it("finds the longest loss streak", () => {
    const results = ["loss", "win", "loss", "loss", "loss", "win"] as const;
    expect(computeStreaks([...results]).longestLoss).toBe(3);
  });

  it("resets the current streak when the result flips", () => {
    const results = ["win", "loss", "win", "loss"] as const;
    expect(computeStreaks([...results])).toEqual({ longestWin: 1, longestLoss: 1 });
  });

  it("counts a streak that runs to the end of the history", () => {
    const results = ["loss", "win", "win", "win"] as const;
    expect(computeStreaks([...results])).toEqual({ longestWin: 3, longestLoss: 1 });
  });

  it("handles an all-wins history", () => {
    const results = ["win", "win", "win", "win"] as const;
    expect(computeStreaks([...results])).toEqual({ longestWin: 4, longestLoss: 0 });
  });
});

describe("formatPercent", () => {
  it("formats 0 as '0%'", () => {
    expect(formatPercent(0)).toBe("0%");
  });

  it("formats 75 as '75%'", () => {
    expect(formatPercent(75)).toBe("75%");
  });

  it("formats 100 as '100%'", () => {
    expect(formatPercent(100)).toBe("100%");
  });
});
