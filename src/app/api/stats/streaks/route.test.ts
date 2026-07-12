import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { GET } from "@/app/api/stats/streaks/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { MatchResult } from "@/types/killer";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    match: { findMany: vi.fn() },
  },
}));

const SESSION: Session = { user: { id: "u1" }, expires: "2999-01-01T00:00:00.000Z" };

let nextId = 1;
function match(killerId: number, result: MatchResult) {
  return { id: nextId++, killerId, result, createdAt: new Date() };
}

describe("GET /api/stats/streaks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(SESSION);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns zeroed streaks when there are no matches", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.global).toEqual({ longestWin: 0, longestLoss: 0 });
    expect(body.perKiller).toEqual({});
  });

  it("computes the global streak across all matches in chronological order", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([
      match(1, "win"),
      match(2, "win"),
      match(1, "win"),
      match(2, "loss"),
      match(1, "loss"),
    ]);
    const res = await GET();
    const body = await res.json();
    expect(body.global).toEqual({ longestWin: 3, longestLoss: 2 });
  });

  it("computes per-killer streaks independently", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([
      match(1, "win"),
      match(2, "loss"),
      match(1, "win"),
      match(2, "loss"),
      match(1, "loss"),
    ]);
    const res = await GET();
    const body = await res.json();
    expect(body.perKiller[1]).toEqual({ longestWin: 2, longestLoss: 1 });
    expect(body.perKiller[2]).toEqual({ longestWin: 0, longestLoss: 2 });
  });

  it("fetches only the current user's matches ordered by createdAt ascending", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([]);
    await GET();
    expect(vi.mocked(prisma.match.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" }, orderBy: { createdAt: "asc" } })
    );
  });
});
