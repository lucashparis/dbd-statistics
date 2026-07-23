import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/invites/[id]/respond/route";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { crewMember: { findUnique: vi.fn(), update: vi.fn() } },
}));

const params = { params: Promise.resolve({ id: "5" }) };
function post(body: unknown) {
  return new Request("http://localhost/api/invites/5/respond", { method: "POST", body: JSON.stringify(body) });
}

describe("POST /api/invites/[id]/respond", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u2");
    vi.mocked(prisma.crewMember.findUnique).mockResolvedValue({ userId: "u2", status: "pending" } as never);
  });

  it("401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await POST(post({ action: "accept" }), params)).status).toBe(401);
  });

  it("400 on an invalid action", async () => {
    expect((await POST(post({ action: "maybe" }), params)).status).toBe(400);
  });

  it("404 when the invite belongs to another user", async () => {
    vi.mocked(prisma.crewMember.findUnique).mockResolvedValueOnce({ userId: "other", status: "pending" } as never);
    expect((await POST(post({ action: "accept" }), params)).status).toBe(404);
  });

  it("409 when the invite was already answered", async () => {
    vi.mocked(prisma.crewMember.findUnique).mockResolvedValueOnce({ userId: "u2", status: "accepted" } as never);
    expect((await POST(post({ action: "accept" }), params)).status).toBe(409);
  });

  it("accepts the invite", async () => {
    const res = await POST(post({ action: "accept" }), params);
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.crewMember.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 }, data: expect.objectContaining({ status: "accepted" }) })
    );
  });

  it("declines the invite", async () => {
    await POST(post({ action: "decline" }), params);
    expect(vi.mocked(prisma.crewMember.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "declined" }) })
    );
  });
});
