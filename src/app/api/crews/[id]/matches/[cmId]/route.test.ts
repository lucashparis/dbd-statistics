import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/crews/[id]/matches/[cmId]/route";
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
    crewMatch: { findUnique: vi.fn(), delete: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    crewStreakRun: { deleteMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma));
  return { prisma };
});

const crew = {
  ownerId: "u1",
  writePolicy: "allMembers" as const,
  members: [
    { userId: "u1", status: "accepted" as const },
    { userId: "u2", status: "accepted" as const },
  ],
};
const req = new Request("http://localhost/api/crews/1/matches/5", { method: "DELETE" });
const params = { params: Promise.resolve({ id: "1", cmId: "5" }) };

describe("DELETE /api/crews/[id]/matches/[cmId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    vi.mocked(prisma.$transaction).mockImplementation(
      ((cb: (tx: typeof prisma) => unknown) => cb(prisma)) as never
    );
    vi.mocked(prisma.crewMatch.findUnique).mockResolvedValue({ crewId: 1, crew } as never);
    vi.mocked(prisma.crewMatch.findMany).mockResolvedValue([]);
    vi.mocked(getCrewDetail).mockResolvedValue({ id: 1 } as never);
  });

  it("404 when the match belongs to another crew", async () => {
    vi.mocked(prisma.crewMatch.findUnique).mockResolvedValueOnce({ crewId: 99, crew } as never);
    expect((await DELETE(req, params)).status).toBe(404);
  });

  it("403 when policy is hostOnly and caller is not the host", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u2");
    vi.mocked(prisma.crewMatch.findUnique).mockResolvedValueOnce({
      crewId: 1,
      crew: { ...crew, writePolicy: "hostOnly" },
    } as never);
    expect((await DELETE(req, params)).status).toBe(403);
  });

  it("deletes the match, recomputes runs and revalidates every member", async () => {
    const res = await DELETE(req, params);
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.crewMatch.delete)).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(vi.mocked(prisma.crewStreakRun.deleteMany)).toHaveBeenCalledWith({ where: { crewId: 1 } });
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("streaks:u1", "max");
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("streaks:u2", "max");
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("community", "max");
  });
});
