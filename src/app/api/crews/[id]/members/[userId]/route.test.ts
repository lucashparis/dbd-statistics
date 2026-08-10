import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/crews/[id]/members/[userId]/route";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getCrewDetail } from "@/lib/crews";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/crews", () => ({ getCrewDetail: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { crew: { findUnique: vi.fn() }, crewMember: { delete: vi.fn() } },
}));
vi.mock("@/lib/ban", () => ({
  blockIfBanned: vi.fn(async () => null),
  isBanned: vi.fn(async () => false),
}));

const req = new Request("http://localhost/api/crews/1/members/u2", { method: "DELETE" });
const params = (userId: string) => ({ params: Promise.resolve({ id: "1", userId }) });

describe("DELETE /api/crews/[id]/members/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    vi.mocked(prisma.crew.findUnique).mockResolvedValue({ ownerId: "u1" } as never);
    vi.mocked(getCrewDetail).mockResolvedValue({ id: 1 } as never);
  });

  it("401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await DELETE(req, params("u2"))).status).toBe(401);
  });

  it("403 when a non-owner tries to remove", async () => {
    vi.mocked(prisma.crew.findUnique).mockResolvedValueOnce({ ownerId: "other" } as never);
    expect((await DELETE(req, params("u2"))).status).toBe(403);
  });

  it("400 when trying to remove the host", async () => {
    expect((await DELETE(req, params("u1"))).status).toBe(400);
  });

  it("removes the member and returns the updated crew", async () => {
    const res = await DELETE(req, params("u2"));
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.crewMember.delete)).toHaveBeenCalledWith({
      where: { crewId_userId: { crewId: 1, userId: "u2" } },
    });
  });
});
