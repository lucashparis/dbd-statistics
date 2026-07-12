import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { PATCH } from "@/app/api/killers/[id]/loss/undo/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    match: { findFirst: vi.fn(), delete: vi.fn(), count: vi.fn() },
    killer: { findUnique: vi.fn() },
  },
}));

const SESSION: Session = { user: { id: "u1" }, expires: "2999-01-01T00:00:00.000Z" };
const killerRow = {
  id: 2,
  name: "Wraith",
  imageUrl: "https://example.com/wraith.png",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function req() {
  return new Request("http://localhost/api/killers/2/loss/undo", { method: "PATCH" });
}

describe("PATCH /api/killers/[id]/loss/undo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(SESSION);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "2" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is not a number", async () => {
    const res = await PATCH(req(), { params: Promise.resolve({ id: "xyz" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the killer does not exist", async () => {
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(null);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("deletes the most recent quick-log loss and returns recomputed stats", async () => {
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: 99 } as never);
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(killerRow);
    vi.mocked(prisma.match.count).mockResolvedValueOnce(3).mockResolvedValueOnce(6);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "2" }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.match.delete)).toHaveBeenCalledWith({ where: { id: 99 } });
    const body = await res.json();
    expect(body).toMatchObject({ id: 2, losses: 6 });
  });

  it("is a no-op (no delete) when there is no quick-log loss to undo", async () => {
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(killerRow);
    vi.mocked(prisma.match.count).mockResolvedValueOnce(3).mockResolvedValueOnce(7);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "2" }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.match.delete)).not.toHaveBeenCalled();
  });

  it("returns 500 when the deletion fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: 99 } as never);
    vi.mocked(prisma.match.delete).mockRejectedValueOnce(new Error("db down"));
    const res = await PATCH(req(), { params: Promise.resolve({ id: "2" }) });
    expect(res.status).toBe(500);
  });
});
