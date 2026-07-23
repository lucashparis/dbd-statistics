import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/rank/route";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getRankedProfiles } from "@/lib/community";
import type { RankEntry, RankPage } from "@/types/profile";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/community", () => ({ getRankedProfiles: vi.fn() }));

function emptyPage(): RankPage {
  return { entries: [], hasMore: false, me: null };
}

function req(qs = "") {
  return new Request(`http://localhost/api/rank${qs}`);
}

describe("GET /api/rank", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("viewer1");
    vi.mocked(getRankedProfiles).mockResolvedValue(emptyPage());
  });

  it("returns 401 when unauthenticated and never touches the lib", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(vi.mocked(getRankedProfiles)).not.toHaveBeenCalled();
  });

  it("forwards validated params and the session viewer id to the lib", async () => {
    const res = await GET(req("?metric=wins&search=neo&page=2"));
    expect(res.status).toBe(200);
    expect(vi.mocked(getRankedProfiles)).toHaveBeenCalledWith({
      metric: "wins",
      search: "neo",
      page: 2,
      pageSize: 10,
      viewerId: "viewer1",
      perspective: "survivor",
    });
  });

  it("forwards the killer perspective to the lib", async () => {
    await GET(req("?perspective=killer"));
    expect(vi.mocked(getRankedProfiles).mock.calls[0][0].perspective).toBe("killer");
  });

  it("coerces an invalid metric to 'matches'", async () => {
    await GET(req("?metric=bogus"));
    expect(vi.mocked(getRankedProfiles).mock.calls[0][0].metric).toBe("matches");
  });

  it("falls back to page 1 for an invalid page", async () => {
    await GET(req("?page=-5"));
    expect(vi.mocked(getRankedProfiles).mock.calls[0][0].page).toBe(1);
  });

  it("truncates an overly long search to 60 characters", async () => {
    await GET(req(`?search=${"a".repeat(200)}`));
    expect(vi.mocked(getRankedProfiles).mock.calls[0][0].search).toHaveLength(60);
  });

  it("returns the rank payload including the viewer's own ranked entry", async () => {
    const entry: RankEntry = {
      userId: "viewer1",
      name: "Me",
      nick: "me",
      channelUrl: null,
      mainKiller: null,
      mainSurv: null,
      stats: { total: 40, wins: 30, losses: 10, winRate: 75 },
      rank: 3,
    };
    vi.mocked(getRankedProfiles).mockResolvedValueOnce({
      entries: [],
      hasMore: false,
      me: { status: "ranked", entry },
    });
    const body = await (await GET(req())).json();
    expect(body.me.status).toBe("ranked");
    expect(body.me.entry.rank).toBe(3);
    expect(JSON.stringify(body)).not.toContain("password");
  });

  it("returns 500 when the lib throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getRankedProfiles).mockRejectedValueOnce(new Error("boom"));
    expect((await GET(req())).status).toBe(500);
  });
});
