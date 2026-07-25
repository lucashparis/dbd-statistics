import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/community/profiles/route";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getPublicProfiles } from "@/lib/community";
import { currentSeasonId } from "@/lib/seasons";
import type { PublicProfileSummary } from "@/types/profile";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/community", () => ({ getPublicProfiles: vi.fn() }));

function summary(userId: string): PublicProfileSummary {
  return {
    userId,
    name: userId,
    nick: userId,
    channelUrl: null,
    mainKiller: null,
    mainSurv: null,
    stats: { total: 0, wins: 0, losses: 0, winRate: 0 },
  };
}

function req(page?: string) {
  const url = page ? `http://localhost/api/community/profiles?page=${page}` : "http://localhost/api/community/profiles";
  return new Request(url);
}

describe("GET /api/community/profiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await GET(req())).status).toBe(401);
  });

  it("returns the first page and reports hasMore when the cap overflows", async () => {
    // limit for page 1 is 12 + 1 = 13; a full 13 means there is a 13th → hasMore
    vi.mocked(getPublicProfiles).mockResolvedValueOnce(
      Array.from({ length: 13 }, (_, i) => summary(`u${i}`))
    );
    const res = await GET(req("1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profiles).toHaveLength(12);
    expect(body.hasMore).toBe(true);
    expect(vi.mocked(getPublicProfiles)).toHaveBeenCalledWith({
      limit: 13,
      perspective: "survivor",
      season: currentSeasonId(),
    });
  });

  it("forwards the requested season to the lib", async () => {
    vi.mocked(getPublicProfiles).mockResolvedValueOnce([]);
    await GET(new Request("http://localhost/api/community/profiles?page=1&season=0"));
    expect(vi.mocked(getPublicProfiles).mock.calls[0][0].season).toBe(0);
  });

  it("reports hasMore=false on the last page", async () => {
    vi.mocked(getPublicProfiles).mockResolvedValueOnce([summary("a"), summary("b")]);
    const body = await (await GET(req("1"))).json();
    expect(body.profiles).toHaveLength(2);
    expect(body.hasMore).toBe(false);
  });

  it("returns 500 when the community lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getPublicProfiles).mockRejectedValueOnce(new Error("db down"));
    expect((await GET(req("1"))).status).toBe(500);
  });
});
