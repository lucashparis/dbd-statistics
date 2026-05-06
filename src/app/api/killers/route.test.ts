import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/killers/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    killer: { findMany: vi.fn() },
  },
}));

const killerFixture = {
  id: 1,
  name: "Trapper",
  imageUrl: "https://example.com/trapper.png",
  wins: 6,
  losses: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GET /api/killers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with killers list on success", async () => {
    vi.mocked(prisma.killer.findMany).mockResolvedValueOnce([killerFixture]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Trapper");
  });

  it("returns 500 when database throws", async () => {
    vi.mocked(prisma.killer.findMany).mockRejectedValueOnce(new Error("DB error"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
