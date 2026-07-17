import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { Prisma } from "@prisma/client";
import { PATCH } from "@/app/api/killers/[id]/win/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidateTag } from "next/cache";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    match: { create: vi.fn(), count: vi.fn() },
    killer: { findUnique: vi.fn() },
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

function req() {
  return new Request("http://localhost/api/killers/1/win", { method: "PATCH" });
}

describe("PATCH /api/killers/[id]/win", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(SESSION);
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is not a number", async () => {
    const res = await PATCH(req(), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("creates a win match for the user and returns recomputed stats", async () => {
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(killerRow);
    vi.mocked(prisma.match.count).mockResolvedValueOnce(7).mockResolvedValueOnce(4);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ id: 1, wins: 7, losses: 4 });
    expect(vi.mocked(prisma.match.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", killerId: 1, result: "win", teamId: null }),
      })
    );
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("community", "max");
  });

  it("returns 404 when the killer does not exist (foreign-key violation)", async () => {
    vi.mocked(prisma.match.create).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("FK", { code: "P2003", clientVersion: "5" })
    );
    const res = await PATCH(req(), { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("returns 500 when the database fails unexpectedly", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.match.create).mockRejectedValueOnce(new Error("db down"));
    const res = await PATCH(req(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(500);
  });
});
