import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/streaks/route";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getTeamStreaks } from "@/lib/streak";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/streak", () => ({ getTeamStreaks: vi.fn() }));

const teamStreak = {
  team: { id: 1, name: "Alpha", createdAt: "2024-01-01T00:00:00.000Z", members: [] },
  currentStreak: 2,
  bestStreak: 4,
  totalMatches: 6,
  wins: 4,
  losses: 2,
  winRate: 67,
  matches: [],
};

function req(season?: string) {
  const qs = season ? `?season=${season}` : "";
  return new Request(`http://localhost/api/streaks${qs}`);
}

describe("GET /api/streaks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await GET(req())).status).toBe(401);
  });

  it("returns the team streaks for the current user", async () => {
    vi.mocked(getTeamStreaks).mockResolvedValueOnce([teamStreak]);
    const res = await GET(req("all"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].currentStreak).toBe(2);
    expect(vi.mocked(getTeamStreaks)).toHaveBeenCalledWith("u1", "all");
  });

  it("passes the requested season window through", async () => {
    vi.mocked(getTeamStreaks).mockResolvedValueOnce([]);
    await GET(req("0"));
    expect(vi.mocked(getTeamStreaks)).toHaveBeenCalledWith("u1", 0);
  });
});
