import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { PATCH } from "@/app/api/killers/[id]/win/undo/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    match: { findFirst: vi.fn(), delete: vi.fn(), count: vi.fn() },
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
  return new Request("http://localhost/api/killers/1/win/undo", { method: "PATCH" });
}

describe("PATCH /api/killers/[id]/win/undo", () => {
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

  it("returns 404 when the killer does not exist", async () => {
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(null);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("deletes the most recent quick-log win and returns recomputed stats", async () => {
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: 42 } as never);
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(killerRow);
    vi.mocked(prisma.match.count).mockResolvedValueOnce(4).mockResolvedValueOnce(4);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.match.delete)).toHaveBeenCalledWith({ where: { id: 42 } });
    const body = await res.json();
    expect(body).toMatchObject({ id: 1, wins: 4 });
  });

  it("is a no-op (no delete) when there is no quick-log win to undo", async () => {
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(killerRow);
    vi.mocked(prisma.match.count).mockResolvedValueOnce(5).mockResolvedValueOnce(4);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.match.delete)).not.toHaveBeenCalled();
  });

  it("scopes the undo to quick-log matches (teamId null, user, win)", async () => {
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(killerRow);
    vi.mocked(prisma.match.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    await PATCH(req(), { params: Promise.resolve({ id: "1" }) });
    expect(vi.mocked(prisma.match.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teamId: null, result: "win", userId: "u1", killerId: 1 }),
      })
    );
  });

  it("returns 500 when the deletion fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: 42 } as never);
    vi.mocked(prisma.match.delete).mockRejectedValueOnce(new Error("db down"));
    const res = await PATCH(req(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(500);
  });
});
