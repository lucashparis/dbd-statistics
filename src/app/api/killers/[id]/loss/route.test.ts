import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { PATCH } from "@/app/api/killers/[id]/loss/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    match: { create: vi.fn(), count: vi.fn() },
    killer: { findUnique: vi.fn() },
  },
}));

const SESSION: Session = { user: { id: "u1" }, expires: "2999-01-01T00:00:00.000Z" };
const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);
const killerRow = {
  id: 2,
  name: "Wraith",
  imageUrl: "https://example.com/wraith.png",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function req() {
  return new Request("http://localhost/api/killers/2/loss", { method: "PATCH" });
}

describe("PATCH /api/killers/[id]/loss", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(SESSION);
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "2" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is not a number", async () => {
    const res = await PATCH(req(), { params: Promise.resolve({ id: "xyz" }) });
    expect(res.status).toBe(400);
  });

  it("creates a loss match for the user and returns recomputed stats", async () => {
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(killerRow);
    vi.mocked(prisma.match.count).mockResolvedValueOnce(3).mockResolvedValueOnce(8);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "2" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ id: 2, wins: 3, losses: 8 });
    expect(vi.mocked(prisma.match.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", killerId: 2, result: "loss", teamId: null }),
      })
    );
  });

  it("returns 404 when the match creation fails (invalid killer)", async () => {
    vi.mocked(prisma.match.create).mockRejectedValueOnce(new Error("FK violation"));
    const res = await PATCH(req(), { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });
});
