import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { GET } from "@/app/api/killers/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    killer: { findMany: vi.fn() },
    match: { groupBy: vi.fn() },
  },
}));

const SESSION: Session = { user: { id: "u1" }, expires: "2999-01-01T00:00:00.000Z" };
const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);
const killerRow = {
  id: 1,
  name: "Trapper",
  imageUrl: "https://example.com/trapper.png",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GET /api/killers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(SESSION);
  });

  const req = (url = "http://localhost/api/killers") => new Request(url);

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("returns 200 with per-user computed stats (survivor by default)", async () => {
    vi.mocked(prisma.killer.findMany).mockResolvedValueOnce([killerRow]);
    vi.mocked(prisma.match.groupBy).mockResolvedValueOnce([
      { killerId: 1, result: "win", _count: { _all: 6 } },
      { killerId: 1, result: "loss", _count: { _all: 4 } },
    ] as never);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ name: "Trapper", wins: 6, losses: 4 });
    expect(vi.mocked(prisma.match.groupBy)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", perspective: "survivor" } })
    );
  });

  it("scopes the query to the killer perspective when requested", async () => {
    vi.mocked(prisma.killer.findMany).mockResolvedValueOnce([killerRow]);
    vi.mocked(prisma.match.groupBy).mockResolvedValueOnce([] as never);
    await GET(req("http://localhost/api/killers?perspective=killer"));
    expect(vi.mocked(prisma.match.groupBy)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", perspective: "killer" } })
    );
  });

  it("returns 500 when the database throws", async () => {
    vi.mocked(prisma.killer.findMany).mockRejectedValueOnce(new Error("DB error"));
    vi.mocked(prisma.match.groupBy).mockResolvedValueOnce([] as never);
    const res = await GET(req());
    expect(res.status).toBe(500);
  });
});
