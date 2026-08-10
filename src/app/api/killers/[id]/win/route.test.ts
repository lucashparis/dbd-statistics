import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { Prisma } from "@prisma/client";
import { PATCH } from "@/app/api/killers/[id]/win/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { blockIfBanned } from "@/lib/ban";
import { BAN_CODE, BAN_TITLE } from "@/lib/ban-message";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    match: { create: vi.fn(), count: vi.fn() },
    killer: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/ban", () => ({
  blockIfBanned: vi.fn(async () => null),
  isBanned: vi.fn(async () => false),
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

function req(season?: string) {
  const qs = season ? `?season=${season}` : "";
  return new Request(`http://localhost/api/killers/1/win${qs}`, { method: "PATCH" });
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

  it("returns the ban 403 without writing a match when the user is on the ban list", async () => {
    vi.mocked(blockIfBanned).mockResolvedValueOnce(
      NextResponse.json({ code: BAN_CODE, error: BAN_TITLE }, { status: 403 })
    );
    const res = await PATCH(req(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe(BAN_CODE);
    expect(vi.mocked(prisma.match.create)).not.toHaveBeenCalled();
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

  it("rejects a write aimed at a past season with 409 and writes nothing", async () => {
    const res = await PATCH(req("0"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Past seasons are read-only" });
    expect(vi.mocked(prisma.match.create)).not.toHaveBeenCalled();
  });

  it("accepts a write while the all-time window is selected", async () => {
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(killerRow);
    vi.mocked(prisma.match.count).mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const res = await PATCH(req("all"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.match.create)).toHaveBeenCalled();
  });

  it("projects the response through the selected season window", async () => {
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(killerRow);
    vi.mocked(prisma.match.count).mockResolvedValue(2);
    await PATCH(req("1"), { params: Promise.resolve({ id: "1" }) });
    expect(vi.mocked(prisma.match.count).mock.calls[0][0]?.where).toMatchObject({
      createdAt: {
        gte: new Date("2026-07-15T03:00:00.000Z"),
        lt: new Date("2026-10-15T03:00:00.000Z"),
      },
    });
  });
});
