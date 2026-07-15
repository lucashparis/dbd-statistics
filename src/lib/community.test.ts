import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPublicProfiles, getPublicProfile } from "@/lib/community";
import { prisma } from "@/lib/prisma";
import { getKillersForUser } from "@/lib/killers";
import { getStreaksForUser } from "@/lib/streak";

vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/killers", () => ({ getKillersForUser: vi.fn() }));
vi.mock("@/lib/streak", () => ({ getStreaksForUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findMany: vi.fn(), findUnique: vi.fn() },
    match: { groupBy: vi.fn() },
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
