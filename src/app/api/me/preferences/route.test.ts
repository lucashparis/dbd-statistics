import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/me/preferences/route";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { update: vi.fn() } },
}));

const userIdMock = vi.mocked(getSessionUserId);

function req(body: unknown) {
  return new Request("http://localhost/api/me/preferences", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/me/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userIdMock.mockResolvedValue("u1");
  });

  it("returns 401 when unauthenticated", async () => {
    userIdMock.mockResolvedValueOnce(null);
    const res = await PATCH(req({ mode: "killer" }));
    expect(res.status).toBe(401);
    expect(vi.mocked(prisma.user.update)).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid mode", async () => {
    const res = await PATCH(req({ mode: "spectator" }));
    expect(res.status).toBe(400);
    expect(vi.mocked(prisma.user.update)).not.toHaveBeenCalled();
  });

  it("returns 400 for a missing body", async () => {
    const res = await PATCH(req({}));
    expect(res.status).toBe(400);
  });

  it("persists the mode and echoes it back", async () => {
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);
    const res = await PATCH(req({ mode: "killer" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ mode: "killer" });
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { preferredMode: "killer" },
    });
  });

  it("returns 500 when the database throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.user.update).mockRejectedValueOnce(new Error("DB error"));
    const res = await PATCH(req({ mode: "survivor" }));
    expect(res.status).toBe(500);
  });
});
