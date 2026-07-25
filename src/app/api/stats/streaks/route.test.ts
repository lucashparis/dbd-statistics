import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { GET } from "@/app/api/stats/streaks/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { MatchResult } from "@/types/killer";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    match: { findMany: vi.fn() },
  },
}));

const SESSION: Session = { user: { id: "u1" }, expires: "2999-01-01T00:00:00.000Z" };
const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);

function req(season?: string) {
  const qs = season ? `?season=${season}` : "";
  return new Request(`http://localhost/api/stats/streaks${qs}`);
}

let nextId = 1;
function match(killerId: number, result: MatchResult) {
  return { id: nextId++, userId: "u1", killerId, teamId: null, streakRunId: null, crewMatchId: null, result, perspective: "survivor" as const, createdAt: new Date() };
}

describe("GET /api/stats/streaks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(SESSION);
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("returns zeroed streaks when there are no matches", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([]);
    const res = await GET(req());
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
    const res = await GET(req());
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
    const res = await GET(req());
    const body = await res.json();
    expect(body.perKiller[1]).toEqual({ longestWin: 2, longestLoss: 1 });
    expect(body.perKiller[2]).toEqual({ longestWin: 0, longestLoss: 2 });
  });

  it("fetches only the current user's matches ordered by createdAt ascending", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([]);
    await GET(req("all"));
    expect(vi.mocked(prisma.match.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", perspective: "survivor" }, orderBy: { createdAt: "asc" } })
    );
  });

  it("narrows the query to the requested season window", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([]);
    await GET(req("0"));
    const where = vi.mocked(prisma.match.findMany).mock.calls[0][0]?.where as {
      createdAt?: { lt?: Date; gte?: Date };
    };
    expect(where.createdAt?.lt).toEqual(new Date("2026-07-15T03:00:00.000Z"));
    expect(where.createdAt?.gte).toBeUndefined();
  });

  it("applies no date filter for the all-time selection", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([]);
    await GET(req("all"));
    const where = vi.mocked(prisma.match.findMany).mock.calls[0][0]?.where as {
      createdAt?: unknown;
    };
    expect(where.createdAt).toBeUndefined();
  });

  it("returns 500 when the database query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.match.findMany).mockRejectedValueOnce(new Error("db down"));
    const res = await GET(req());
    expect(res.status).toBe(500);
  });
});

