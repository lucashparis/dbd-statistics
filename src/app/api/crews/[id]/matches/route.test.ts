import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/crews/[id]/matches/route";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getCrewDetail } from "@/lib/crews";
import { revalidateTag } from "next/cache";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/crews", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crews")>();
  return { ...actual, getCrewDetail: vi.fn() };
});
vi.mock("@/lib/prisma", () => {
  const prisma = {
    crew: { findUnique: vi.fn() },
    killer: { findUnique: vi.fn() },
    crewStreakRun: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    crewMatch: { create: vi.fn() },
    match: { createMany: vi.fn() },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma));
  return { prisma };
});

const readyCrew = {
  ownerId: "u1",
  writePolicy: "allMembers" as const,
  members: [
    { userId: "u1", status: "accepted" as const },
    { userId: "u2", status: "accepted" as const },
  ],
};

function post(body: unknown) {
  return new Request("http://localhost/api/crews/1/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const params = { params: Promise.resolve({ id: "1" }) };

describe("POST /api/crews/[id]/matches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    vi.mocked(prisma.$transaction).mockImplementation(
      ((cb: (tx: typeof prisma) => unknown) => cb(prisma)) as never
    );
    vi.mocked(prisma.crew.findUnique).mockResolvedValue(readyCrew as never);
    vi.mocked(prisma.killer.findUnique).mockResolvedValue({ id: 9 } as never);
    vi.mocked(prisma.crewStreakRun.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.crewStreakRun.create).mockResolvedValue({ id: 50 } as never);
    vi.mocked(prisma.crewMatch.create).mockResolvedValue({ id: 77 } as never);
    vi.mocked(getCrewDetail).mockResolvedValue({ id: 1 } as never);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await POST(post({ killerId: 9, result: "win" }), params)).status).toBe(401);
  });

  it("returns 400 on invalid input", async () => {
    expect((await POST(post({ result: "maybe" }), params)).status).toBe(400);
  });

  it("returns 404 when crew does not exist", async () => {
    vi.mocked(prisma.crew.findUnique).mockResolvedValueOnce(null);
    expect((await POST(post({ killerId: 9, result: "win" }), params)).status).toBe(404);
  });

  it("returns 404 when the caller is not an accepted member", async () => {
    vi.mocked(prisma.crew.findUnique).mockResolvedValueOnce({
      ...readyCrew,
      members: [{ userId: "someoneElse", status: "accepted" }],
    } as never);
    expect((await POST(post({ killerId: 9, result: "win" }), params)).status).toBe(404);
  });

  it("returns 403 when a member is still pending", async () => {
    vi.mocked(prisma.crew.findUnique).mockResolvedValueOnce({
      ...readyCrew,
      members: [
        { userId: "u1", status: "accepted" },
        { userId: "u2", status: "pending" },
      ],
    } as never);
    expect((await POST(post({ killerId: 9, result: "win" }), params)).status).toBe(403);
  });

  it("returns 403 for a non-host member when policy is hostOnly", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u2");
    vi.mocked(prisma.crew.findUnique).mockResolvedValueOnce({
      ...readyCrew,
      writePolicy: "hostOnly",
    } as never);
    expect((await POST(post({ killerId: 9, result: "win" }), params)).status).toBe(403);
  });

  it("returns 404 when the killer does not exist", async () => {
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(null);
    expect((await POST(post({ killerId: 999, result: "win" }), params)).status).toBe(404);
  });

  it("fans out one Match per accepted member and revalidates each member + community", async () => {
    const res = await POST(post({ killerId: 9, result: "win" }), params);
    expect(res.status).toBe(201);

    expect(vi.mocked(prisma.crewMatch.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ crewId: 1, killerId: 9, result: "win", loggedByUserId: "u1", crewStreakRunId: 50 }) })
    );
    expect(vi.mocked(prisma.match.createMany)).toHaveBeenCalledWith({
      data: [
        { userId: "u1", killerId: 9, result: "win", crewMatchId: 77 },
        { userId: "u2", killerId: 9, result: "win", crewMatchId: 77 },
      ],
    });
    expect(vi.mocked(prisma.crewStreakRun.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 50 }, data: { winCount: { increment: 1 } } })
    );
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("streaks:u1", "max");
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("streaks:u2", "max");
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("community", "max");
  });

  it("closes the active run on a loss without incrementing", async () => {
    vi.mocked(prisma.crewStreakRun.findFirst).mockResolvedValueOnce({ id: 7 } as never);
    const res = await POST(post({ killerId: 9, result: "loss" }), params);
    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.crewStreakRun.create)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.crewStreakRun.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 }, data: expect.objectContaining({ status: "ended" }) })
    );
  });
});
