import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "@/app/api/players/[id]/route";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    player: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    teamPlayer: { count: vi.fn() },
  },
}));

const player = { id: 1, userId: "u1", name: "Lucas", nick: "OldDead", createdAt: new Date() };

function patch(body: unknown) {
  return new Request("http://localhost/api/players/1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function del() {
  return new Request("http://localhost/api/players/1", { method: "DELETE" });
}
const p1 = { params: Promise.resolve({ id: "1" }) };

describe("PATCH /api/players/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await PATCH(patch({ name: "x" }), p1)).status).toBe(401);
  });

  it("returns 400 for an invalid id", async () => {
    expect((await PATCH(patch({ name: "x" }), { params: Promise.resolve({ id: "abc" }) })).status).toBe(400);
  });

  it("returns 400 when no fields are provided", async () => {
    expect((await PATCH(patch({}), p1)).status).toBe(400);
  });

  it("returns 404 when the player belongs to another user", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValueOnce({ ...player, userId: "someone-else" });
    expect((await PATCH(patch({ name: "x" }), p1)).status).toBe(404);
  });

  it("updates the player on success", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValueOnce(player);
    vi.mocked(prisma.player.update).mockResolvedValueOnce({ ...player, name: "New" });
    const res = await PATCH(patch({ name: "New" }), p1);
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("New");
  });

  it("returns 409 when the new nick collides", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValueOnce(player);
    vi.mocked(prisma.player.update).mockRejectedValueOnce(new Error("unique"));
    expect((await PATCH(patch({ nick: "taken" }), p1)).status).toBe(409);
  });
});

describe("DELETE /api/players/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await DELETE(del(), p1)).status).toBe(401);
  });

  it("returns 404 when the player belongs to another user", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValueOnce({ ...player, userId: "someone-else" });
    expect((await DELETE(del(), p1)).status).toBe(404);
  });

  it("returns 409 when the player is still in a team", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValueOnce(player);
    vi.mocked(prisma.teamPlayer.count).mockResolvedValueOnce(2);
    expect((await DELETE(del(), p1)).status).toBe(409);
  });

  it("returns 204 on successful delete", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValueOnce(player);
    vi.mocked(prisma.teamPlayer.count).mockResolvedValueOnce(0);
    const res = await DELETE(del(), p1);
    expect(res.status).toBe(204);
    expect(vi.mocked(prisma.player.delete)).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
