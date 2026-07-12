import { describe, it, expect, vi, beforeEach } from "vitest";
import { decideStreakAction, getTeamStreak } from "@/lib/streak";
import { prisma } from "@/lib/prisma";

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
