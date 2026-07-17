import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/streaks/matches/route";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getTeamStreak } from "@/lib/streak";
import { revalidateTag } from "next/cache";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/streak", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/streak")>();
  return { ...actual, getTeamStreak: vi.fn() };
});
vi.mock("@/lib/prisma", () => {
  const prisma = {
    team: { findUnique: vi.fn() },
    killer: { findUnique: vi.fn() },
    streakRun: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    match: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma));
  return { prisma };
});

const ownerTeam = { id: 1, userId: "u1", name: "Alpha", createdAt: new Date() };
const killer = { id: 9, name: "Nurse", imageUrl: "" };
const summary = {
  team: { id: 1, name: "Alpha", createdAt: "2024-01-01T00:00:00.000Z", members: [] },
  currentStreak: 1,
  bestStreak: 1,
  totalMatches: 1,
  wins: 1,
  losses: 0,
  winRate: 100,
  matches: [],
};

function post(body: unknown) {
  return new Request("http://localhost/api/streaks/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/streaks/matches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    vi.mocked(prisma.$transaction).mockImplementation(
      ((cb: (tx: typeof prisma) => unknown) => cb(prisma)) as never
    );
    vi.mocked(getTeamStreak).mockResolvedValue(summary);
    vi.mocked(prisma.team.findUnique).mockResolvedValue(ownerTeam);
    vi.mocked(prisma.killer.findUnique).mockResolvedValue(killer as never);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await POST(post({ teamId: 1, killerId: 9, result: "win" }))).status).toBe(401);
  });

  it("returns 400 on invalid input", async () => {
    expect((await POST(post({ teamId: 1, result: "maybe" }))).status).toBe(400);
  });

  it("returns 404 when the team belongs to another user", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValueOnce({ ...ownerTeam, userId: "other" });
    expect((await POST(post({ teamId: 1, killerId: 9, result: "win" }))).status).toBe(404);
  });

  it("returns 404 when the killer does not exist", async () => {
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(null);
    expect((await POST(post({ teamId: 1, killerId: 999, result: "win" }))).status).toBe(404);
  });

  it("creates a run and increments on the first win", async () => {
    vi.mocked(prisma.streakRun.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.streakRun.create).mockResolvedValueOnce({ id: 99 } as never);

    const res = await POST(post({ teamId: 1, killerId: 9, result: "win" }));
    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.streakRun.create)).toHaveBeenCalled();
    expect(vi.mocked(prisma.match.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ result: "win", streakRunId: 99, teamId: 1 }) })
    );
    expect(vi.mocked(prisma.streakRun.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 99 }, data: { winCount: { increment: 1 } } })
    );
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("community", "max");
  });

  it("closes the active run on a loss without incrementing", async () => {
    vi.mocked(prisma.streakRun.findFirst).mockResolvedValueOnce({ id: 7 } as never);

    const res = await POST(post({ teamId: 1, killerId: 9, result: "loss" }));
    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.streakRun.create)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.match.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ result: "loss", streakRunId: 7 }) })
    );
    expect(vi.mocked(prisma.streakRun.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 }, data: expect.objectContaining({ status: "ended" }) })
    );
  });
});
