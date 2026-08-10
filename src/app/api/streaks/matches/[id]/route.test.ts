import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/streaks/matches/[id]/route";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getTeamStreak } from "@/lib/streak";


vi.mock("@/lib/ban", () => ({
  blockIfBanned: vi.fn(async () => null),
  isBanned: vi.fn(async () => false),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/streak", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/streak")>();
  return { ...actual, getTeamStreak: vi.fn() };
});
vi.mock("@/lib/prisma", () => {
  const prisma = {
    match: { findFirst: vi.fn(), delete: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    streakRun: { deleteMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma));
  return { prisma };
});

const summary = {
  team: { id: 1, name: "Alpha", createdAt: "2024-01-01T00:00:00.000Z", members: [] },
  currentStreak: 1,
  bestStreak: 2,
  totalMatches: 2,
  wins: 1,
  losses: 1,
  winRate: 50,
  matches: [],
};

function del(id: string) {
  const req = new Request(`http://localhost/api/streaks/matches/${id}`, { method: "DELETE" });
  return DELETE(req, { params: Promise.resolve({ id }) });
}

describe("DELETE /api/streaks/matches/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    vi.mocked(prisma.$transaction).mockImplementation(
      ((cb: (tx: typeof prisma) => unknown) => cb(prisma)) as never
    );
    vi.mocked(getTeamStreak).mockResolvedValue(summary);
    vi.mocked(prisma.match.findFirst).mockResolvedValue({ id: 5, userId: "u1", teamId: 1 } as never);
    vi.mocked(prisma.match.findMany).mockResolvedValue([
      { id: 6, result: "win", createdAt: new Date(1000) },
    ] as never);
    vi.mocked(prisma.streakRun.create).mockResolvedValue({ id: 42 } as never);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await del("5")).status).toBe(401);
  });

  it("returns 400 on a non-numeric id", async () => {
    expect((await del("abc")).status).toBe(400);
  });

  it("returns 404 when the match does not belong to the user", async () => {
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null);
    expect((await del("5")).status).toBe(404);
  });

  it("returns 404 when the match is not a team match", async () => {
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: 5, userId: "u1", teamId: null } as never);
    expect((await del("5")).status).toBe(404);
    expect(vi.mocked(prisma.match.delete)).not.toHaveBeenCalled();
  });

  it("deletes the match and rebuilds the team's streak runs", async () => {
    const res = await del("5");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(summary);

    expect(vi.mocked(prisma.match.delete)).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(vi.mocked(prisma.streakRun.deleteMany)).toHaveBeenCalledWith({
      where: { userId: "u1", teamId: 1 },
    });
    expect(vi.mocked(prisma.streakRun.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teamId: 1, winCount: 1, status: "active" }),
      })
    );
    expect(vi.mocked(prisma.match.updateMany)).toHaveBeenCalledWith({
      where: { id: { in: [6] } },
      data: { streakRunId: 42 },
    });
  });
});
