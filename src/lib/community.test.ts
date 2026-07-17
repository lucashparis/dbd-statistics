import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPublicProfiles, getPublicProfile, getRankedProfiles } from "@/lib/community";
import { prisma } from "@/lib/prisma";
import { getKillersForUser } from "@/lib/killers";
import { getStreaksForUser } from "@/lib/streak";

vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/killers", () => ({ getKillersForUser: vi.fn() }));
vi.mock("@/lib/streak", () => ({ getStreaksForUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findMany: vi.fn(), findUnique: vi.fn() },
    match: { groupBy: vi.fn(), count: vi.fn() },
  },
}));

function row(userId: string, nick: string, overrides: Record<string, unknown> = {}) {
  return {
    userId,
    nick,
    channelUrl: null,
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    user: { name: `${nick} Name` },
    mainKiller: null,
    mainSurv: null,
    ...overrides,
  };
}

function grp(userId: string, result: "win" | "loss", count: number) {
  return { userId, result, _count: { _all: count } };
}

describe("getPublicProfiles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an empty list when there are no profiles", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValueOnce([]);
    const result = await getPublicProfiles({ limit: 12 });
    expect(result).toEqual([]);
    expect(vi.mocked(prisma.match.groupBy)).not.toHaveBeenCalled();
  });

  it("never selects sensitive user fields", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValueOnce([]);
    await getPublicProfiles({ limit: 12 });
    const select = vi.mocked(prisma.profile.findMany).mock.calls[0][0]?.select as Record<string, unknown>;
    expect(select.user).toEqual({ select: { name: true } });
    expect(JSON.stringify(select)).not.toContain("email");
    expect(JSON.stringify(select)).not.toContain("password");
  });

  it("merges match stats and sorts by total desc, then slices to the limit", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValueOnce([
      row("u1", "quiet"),
      row("u2", "busy"),
      row("u3", "idle"),
    ] as never);
    vi.mocked(prisma.match.groupBy).mockResolvedValueOnce([
      grp("u1", "win", 2),
      grp("u1", "loss", 2),
      grp("u2", "win", 9),
      grp("u2", "loss", 1),
    ] as never);

    const result = await getPublicProfiles({ limit: 2 });

    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe("u2");
    expect(result[0].stats).toEqual({ total: 10, wins: 9, losses: 1, winRate: 90 });
    expect(result[1].userId).toBe("u1");
    expect(result[1].stats).toEqual({ total: 4, wins: 2, losses: 2, winRate: 50 });
    // u3 (zero matches) is pushed out by the limit
    expect(result.find((p) => p.userId === "u3")).toBeUndefined();
  });

  it("degrades to an empty list when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.profile.findMany).mockRejectedValueOnce(new Error("db down"));
    expect(await getPublicProfiles({ limit: 12 })).toEqual([]);
  });
});

describe("getPublicProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when the user has no public profile", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValueOnce(null);
    expect(await getPublicProfile("nobody")).toBeNull();
  });

  it("returns the detail with derived stats, killers and streaks", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValueOnce(
      row("u1", "quiet", {
        mainKiller: { id: 3, name: "Nurse", imageUrl: "https://x/n.png" },
        mainSurv: { id: 7, name: "Nea Karlsson", imageUrl: "https://x/nea.png" },
      }) as never
    );
    vi.mocked(getKillersForUser).mockResolvedValueOnce([
      { id: 1, name: "Trapper", imageUrl: "https://x/t.png", wins: 3, losses: 1, createdAt: "", updatedAt: "" },
      { id: 2, name: "Wraith", imageUrl: "https://x/w.png", wins: 1, losses: 0, createdAt: "", updatedAt: "" },
    ]);
    vi.mocked(getStreaksForUser).mockResolvedValueOnce({
      global: { longestWin: 4, longestLoss: 1 },
      perKiller: {},
    });

    const detail = await getPublicProfile("u1");

    expect(detail).not.toBeNull();
    expect(detail?.nick).toBe("quiet");
    expect(detail?.mainKiller?.name).toBe("Nurse");
    expect(detail?.mainSurv?.name).toBe("Nea Karlsson");
    expect(detail?.stats).toEqual({ total: 5, wins: 4, losses: 1, winRate: 80 });
    expect(detail?.killers).toHaveLength(2);
    expect(detail?.streaks.global.longestWin).toBe(4);
  });

  it("degrades to null when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.profile.findUnique).mockRejectedValueOnce(new Error("db down"));
    expect(await getPublicProfile("u1")).toBeNull();
  });
});

describe("getRankedProfiles", () => {
  beforeEach(() => vi.clearAllMocks());

  // u1..u5 with distinct win/loss so each metric produces a different order.
  // u3 has <30 matches and must never appear. winRate(u1)=round(20/30*100)=67.
  const rows5 = [
    row("u1", "alpha"),
    row("u2", "bravo"),
    row("u3", "charlie"),
    row("u4", "delta"),
    row("u5", "echo"),
  ];
  const groups5 = [
    grp("u1", "win", 20),
    grp("u1", "loss", 10),
    grp("u2", "win", 40),
    grp("u2", "loss", 10),
    grp("u3", "win", 5),
    grp("u3", "loss", 5),
    grp("u4", "win", 25),
    grp("u4", "loss", 25),
    grp("u5", "win", 30),
  ];

  function seed(profiles: unknown[], groups: unknown[]) {
    vi.mocked(prisma.profile.findMany).mockResolvedValue(profiles as never);
    vi.mocked(prisma.match.groupBy).mockResolvedValue(groups as never);
  }

  function rank(overrides: Partial<Parameters<typeof getRankedProfiles>[0]> = {}) {
    return getRankedProfiles({
      metric: "matches",
      search: "",
      page: 1,
      pageSize: 10,
      viewerId: "nobody",
      ...overrides,
    });
  }

  it("excludes profiles with fewer than 30 matches and reports the viewer as belowThreshold", async () => {
    seed(rows5, groups5);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({ userId: "u3" } as never);
    vi.mocked(prisma.match.count).mockResolvedValue(10);
    const { entries, me } = await rank({ viewerId: "u3" });
    expect(entries.find((e) => e.userId === "u3")).toBeUndefined();
    expect(me).toEqual({ status: "belowThreshold", total: 10, remaining: 20 });
  });

  it("orders by matches (total desc, wins desc, userId asc) and numbers the rank", async () => {
    seed(rows5, groups5);
    const { entries } = await rank({ metric: "matches" });
    expect(entries.map((e) => e.userId)).toEqual(["u2", "u4", "u5", "u1"]);
    expect(entries.map((e) => e.rank)).toEqual([1, 2, 3, 4]);
  });

  it("orders by wins (wins desc, total desc, userId asc)", async () => {
    seed(rows5, groups5);
    const { entries } = await rank({ metric: "wins" });
    expect(entries.map((e) => e.userId)).toEqual(["u2", "u5", "u4", "u1"]);
  });

  it("orders by win rate (winRate desc, total desc, userId asc)", async () => {
    seed(rows5, groups5);
    const { entries } = await rank({ metric: "winRate" });
    expect(entries.map((e) => e.userId)).toEqual(["u5", "u2", "u1", "u4"]);
  });

  it("breaks metric ties deterministically by userId ascending", async () => {
    const rowsTie = [row("ub", "bee"), row("ua", "ay")];
    const groupsTie = [
      grp("ua", "win", 20),
      grp("ua", "loss", 10),
      grp("ub", "win", 20),
      grp("ub", "loss", 10),
    ];
    seed(rowsTie, groupsTie);
    const { entries } = await rank({ metric: "matches" });
    expect(entries.map((e) => e.userId)).toEqual(["ua", "ub"]);
  });

  it("searches by nick and by name, case-insensitive", async () => {
    seed(rows5, groups5);
    const byNick = await rank({ search: "BRAV" });
    expect(byNick.entries.map((e) => e.userId)).toEqual(["u2"]);
    // "vo nam" only occurs in the name ("bravo Name"), never in a nick.
    const byName = await rank({ search: "vo nam" });
    expect(byName.entries.map((e) => e.userId)).toEqual(["u2"]);
  });

  it("keeps the viewer's global rank even when the search filters them out", async () => {
    seed(rows5, groups5);
    const { entries, me } = await rank({ metric: "matches", search: "bravo", viewerId: "u1" });
    expect(entries.map((e) => e.userId)).toEqual(["u2"]);
    expect(me?.status).toBe("ranked");
    expect(me?.status === "ranked" && me.entry.userId).toBe("u1");
    expect(me?.status === "ranked" && me.entry.rank).toBe(4);
  });

  it("reports the viewer as noProfile when they have no public profile", async () => {
    seed(rows5, groups5);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.match.count).mockResolvedValue(0);
    expect((await rank({ viewerId: "ghost" })).me).toEqual({ status: "noProfile" });
  });

  it("paginates the eligible list by page and reports hasMore", async () => {
    seed(rows5, groups5);
    const p1 = await rank({ metric: "matches", page: 1, pageSize: 2 });
    expect(p1.entries.map((e) => e.userId)).toEqual(["u2", "u4"]);
    expect(p1.hasMore).toBe(true);
    const p2 = await rank({ metric: "matches", page: 2, pageSize: 2 });
    expect(p2.entries.map((e) => e.userId)).toEqual(["u5", "u1"]);
    expect(p2.hasMore).toBe(false);
  });

  it("degrades to an empty payload when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.profile.findMany).mockRejectedValueOnce(new Error("db down"));
    expect(await rank()).toEqual({ entries: [], hasMore: false, me: null });
  });
});
