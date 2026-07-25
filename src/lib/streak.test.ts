import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  decideStreakAction,
  getTeamStreak,
  recomputeStreakRuns,
  computeStreaksForUser,
  getStreaksForUser,
  runsForWindow,
  currentStreakOf,
  bestStreakOf,
} from "@/lib/streak";
import type { MatchResult } from "@/types/killer";
import { prisma } from "@/lib/prisma";

vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    team: { findFirst: vi.fn() },
    streakRun: { findMany: vi.fn() },
    match: { findMany: vi.fn() },
  },
}));

describe("decideStreakAction", () => {
  it("starts a new run on the first win", () => {
    expect(decideStreakAction(false, "win")).toEqual({
      createRun: true,
      incrementWin: true,
      closeRun: false,
      attachToRun: true,
    });
  });

  it("increments the existing run on a subsequent win", () => {
    expect(decideStreakAction(true, "win")).toEqual({
      createRun: false,
      incrementWin: true,
      closeRun: false,
      attachToRun: true,
    });
  });

  it("closes the active run on a loss", () => {
    expect(decideStreakAction(true, "loss")).toEqual({
      createRun: false,
      incrementWin: false,
      closeRun: true,
      attachToRun: true,
    });
  });

  it("records a loss with no run when none is active", () => {
    expect(decideStreakAction(false, "loss")).toEqual({
      createRun: false,
      incrementWin: false,
      closeRun: false,
      attachToRun: false,
    });
  });
});

describe("recomputeStreakRuns", () => {
  let clock = 0;
  function m(id: number, result: MatchResult) {
    clock += 1;
    return { id, result, createdAt: new Date(clock * 1000) };
  }

  it("returns no runs for an empty timeline", () => {
    expect(recomputeStreakRuns([])).toEqual([]);
  });

  it("ignores losses that occur outside any run", () => {
    expect(recomputeStreakRuns([m(1, "loss"), m(2, "loss")])).toEqual([]);
  });

  it("opens an active run on a lone win", () => {
    const runs = recomputeStreakRuns([m(1, "win")]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ winCount: 1, status: "active", endedAt: null, matchIds: [1] });
  });

  it("closes a run on a loss and attaches the loss to it", () => {
    const win1 = m(1, "win");
    const win2 = m(2, "win");
    const loss = m(3, "loss");
    const runs = recomputeStreakRuns([win1, win2, loss]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      winCount: 2,
      status: "ended",
      startedAt: win1.createdAt,
      endedAt: loss.createdAt,
      matchIds: [1, 2, 3],
    });
  });

  it("splits into an ended run and a fresh active run across a loss", () => {
    const runs = recomputeStreakRuns([m(1, "win"), m(2, "loss"), m(3, "win"), m(4, "win")]);
    expect(runs).toHaveLength(2);
    expect(runs[0]).toMatchObject({ winCount: 1, status: "ended", matchIds: [1, 2] });
    expect(runs[1]).toMatchObject({ winCount: 2, status: "active", endedAt: null, matchIds: [3, 4] });
  });
});

describe("computeStreaksForUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns zeroed streaks when the user has no matches", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([]);
    const result = await computeStreaksForUser("u1");
    expect(result.global).toEqual({ longestWin: 0, longestLoss: 0 });
    expect(result.perKiller).toEqual({});
  });

  it("computes global and per-killer streaks and scopes the query to the user", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([
      { killerId: 1, result: "win" },
      { killerId: 1, result: "win" },
      { killerId: 2, result: "loss" },
      { killerId: 1, result: "loss" },
    ] as never);
    const result = await computeStreaksForUser("u1");
    expect(result.global).toEqual({ longestWin: 2, longestLoss: 2 });
    expect(result.perKiller[1]).toEqual({ longestWin: 2, longestLoss: 1 });
    expect(vi.mocked(prisma.match.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", perspective: "survivor" }, orderBy: { createdAt: "asc" } })
    );
  });
});

describe("computeStreaksForUser season scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds no date filter for the all-time selection", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([]);
    await computeStreaksForUser("u1", "all");
    const where = vi.mocked(prisma.match.findMany).mock.calls[0][0]?.where as {
      createdAt?: unknown;
    };
    expect(where.createdAt).toBeUndefined();
  });

  it("narrows the query to the season window", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([]);
    await computeStreaksForUser("u1", 1);
    const where = vi.mocked(prisma.match.findMany).mock.calls[0][0]?.where as {
      createdAt?: { gte?: Date; lt?: Date };
    };
    expect(where.createdAt).toEqual({
      gte: new Date("2026-07-15T03:00:00.000Z"),
      lt: new Date("2026-10-15T03:00:00.000Z"),
    });
  });
});

describe("runsForWindow", () => {
  const persisted = [{ winCount: 9, status: "ended" as const }];
  // Newest-first, as Prisma returns it: chronologically win, win, loss.
  const newestFirst = [
    { id: 3, result: "loss" as const, createdAt: new Date("2026-08-03T00:00:00Z") },
    { id: 2, result: "win" as const, createdAt: new Date("2026-08-02T00:00:00Z") },
    { id: 1, result: "win" as const, createdAt: new Date("2026-08-01T00:00:00Z") },
  ];

  it("returns the persisted runs untouched for all time", () => {
    expect(runsForWindow(newestFirst, persisted, "all")).toBe(persisted);
  });

  it("rebuilds the runs chronologically for a season window", () => {
    const runs = runsForWindow(newestFirst, persisted, 1);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ winCount: 2, status: "ended" });
  });

  it("returns no runs when the window is empty", () => {
    expect(runsForWindow([], persisted, 1)).toEqual([]);
  });
});

describe("currentStreakOf / bestStreakOf", () => {
  it("reads the active run, or zero when every run is closed", () => {
    expect(currentStreakOf([{ winCount: 4, status: "ended" }, { winCount: 2, status: "active" }])).toBe(2);
    expect(currentStreakOf([{ winCount: 4, status: "ended" }])).toBe(0);
    expect(currentStreakOf([])).toBe(0);
  });

  it("takes the longest run, or zero with no runs", () => {
    expect(bestStreakOf([{ winCount: 4 }, { winCount: 7 }])).toBe(7);
    expect(bestStreakOf([])).toBe(0);
  });
});

describe("getStreaksForUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves the cached streaks payload for the user", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([
      { killerId: 1, result: "win" },
    ] as never);
    const result = await getStreaksForUser("u1");
    expect(result.global.longestWin).toBe(1);
  });
});

describe("getTeamStreak", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when the team does not belong to the user", async () => {
    vi.mocked(prisma.team.findFirst).mockResolvedValueOnce(null);
    expect(await getTeamStreak("u1", 999)).toBeNull();
  });

  it("computes current (active run) and best (max run) streaks with a timeline", async () => {
    vi.mocked(prisma.team.findFirst).mockResolvedValueOnce({
      id: 1,
      name: "Alpha",
      createdAt: new Date(),
      members: [{ player: { id: 1, name: "Lucas", nick: "OldDead" } }],
    } as never);
    vi.mocked(prisma.streakRun.findMany).mockResolvedValueOnce([
      { teamId: 1, winCount: 3, status: "active" },
      { teamId: 1, winCount: 5, status: "ended" },
    ] as never);
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([
      { id: 2, teamId: 1, result: "loss", createdAt: new Date(), killer: { id: 9, name: "Nurse", imageUrl: "" } },
      { id: 1, teamId: 1, result: "win", createdAt: new Date(), killer: { id: 8, name: "Trapper", imageUrl: "" } },
    ] as never);

    const result = await getTeamStreak("u1", 1);
    expect(result).toMatchObject({
      currentStreak: 3,
      bestStreak: 5,
      wins: 1,
      losses: 1,
      totalMatches: 2,
      winRate: 50,
    });
    expect(result?.team.name).toBe("Alpha");
    expect(result?.matches).toHaveLength(2);
  });
});
