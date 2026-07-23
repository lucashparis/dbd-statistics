import { describe, it, expect, vi, beforeEach } from "vitest";
import { getKillersForUser, getKillerForUser } from "@/lib/killers";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    killer: { findMany: vi.fn(), findUnique: vi.fn() },
    match: { groupBy: vi.fn(), count: vi.fn() },
  },
}));

const trapper = {
  id: 1,
  name: "Trapper",
  imageUrl: "x",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};
const nurse = {
  id: 2,
  name: "Nurse",
  imageUrl: "y",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("getKillersForUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps grouped match counts onto killers, defaulting missing ones to 0", async () => {
    vi.mocked(prisma.killer.findMany).mockResolvedValueOnce([trapper, nurse]);
    vi.mocked(prisma.match.groupBy).mockResolvedValueOnce([
      { killerId: 1, result: "win", _count: { _all: 6 } },
      { killerId: 1, result: "loss", _count: { _all: 4 } },
    ] as never);

    const result = await getKillersForUser("u1");

    expect(result[0]).toMatchObject({ id: 1, wins: 6, losses: 4 });
    expect(result[1]).toMatchObject({ id: 2, wins: 0, losses: 0 });
    expect(typeof result[0].createdAt).toBe("string");
  });

  it("defaults to the survivor perspective", async () => {
    vi.mocked(prisma.killer.findMany).mockResolvedValueOnce([trapper]);
    vi.mocked(prisma.match.groupBy).mockResolvedValueOnce([] as never);
    await getKillersForUser("u1");
    expect(vi.mocked(prisma.match.groupBy)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", perspective: "survivor" } })
    );
  });

  it("scopes counts to the killer perspective, isolating survivor data", async () => {
    vi.mocked(prisma.killer.findMany).mockResolvedValueOnce([trapper]);
    vi.mocked(prisma.match.groupBy).mockResolvedValueOnce([] as never);
    await getKillersForUser("u1", "killer");
    expect(vi.mocked(prisma.match.groupBy)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", perspective: "killer" } })
    );
  });
});

describe("getKillerForUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when the killer does not exist", async () => {
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(null);
    expect(await getKillerForUser("u1", 999)).toBeNull();
  });

  it("returns computed wins/losses for the killer", async () => {
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(trapper);
    vi.mocked(prisma.match.count).mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    const result = await getKillerForUser("u1", 1);
    expect(result).toMatchObject({ id: 1, wins: 3, losses: 2 });
    expect(vi.mocked(prisma.match.count)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", killerId: 1, result: "win", perspective: "survivor" } })
    );
  });

  it("counts only killer-perspective matches when asked", async () => {
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(trapper);
    vi.mocked(prisma.match.count).mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    await getKillerForUser("u1", 1, "killer");
    expect(vi.mocked(prisma.match.count)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", killerId: 1, result: "win", perspective: "killer" } })
    );
  });
});
