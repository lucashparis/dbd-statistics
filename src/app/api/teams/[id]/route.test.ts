import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "@/app/api/teams/[id]/route";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    team: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    player: { count: vi.fn() },
  },
}));

const ownerTeam = { id: 10, userId: "u1", name: "Alpha", createdAt: new Date() };
const teamWithMembers = {
  id: 10,
  name: "Bravo",
  createdAt: new Date(),
  members: [{ player: { id: 1, name: "Lucas", nick: "OldDead" } }],
};

function patch(body: unknown) {
  return new Request("http://localhost/api/teams/10", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function del() {
  return new Request("http://localhost/api/teams/10", { method: "DELETE" });
}
const p10 = { params: Promise.resolve({ id: "10" }) };

describe("PATCH /api/teams/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await PATCH(patch({ name: "Bravo" }), p10)).status).toBe(401);
  });

  it("returns 400 for an invalid id", async () => {
    expect((await PATCH(patch({ name: "Bravo" }), { params: Promise.resolve({ id: "x" }) })).status).toBe(400);
  });

  it("returns 400 when nothing is provided", async () => {
    expect((await PATCH(patch({}), p10)).status).toBe(400);
  });

  it("returns 404 when the team belongs to another user", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValueOnce({ ...ownerTeam, userId: "other" });
    expect((await PATCH(patch({ name: "Bravo" }), p10)).status).toBe(404);
  });

  it("returns 400 when a new member is not owned by the user", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(ownerTeam);
    vi.mocked(prisma.player.count).mockResolvedValueOnce(0);
    expect((await PATCH(patch({ playerIds: [99] }), p10)).status).toBe(400);
  });

  it("updates the team on success", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(ownerTeam);
    vi.mocked(prisma.team.update).mockResolvedValueOnce(teamWithMembers as never);
    const res = await PATCH(patch({ name: "Bravo" }), p10);
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Bravo");
  });

  it("returns 409 when the new name collides", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(ownerTeam);
    vi.mocked(prisma.team.update).mockRejectedValueOnce(new Error("unique"));
    expect((await PATCH(patch({ name: "Bravo" }), p10)).status).toBe(409);
  });
});

describe("DELETE /api/teams/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await DELETE(del(), p10)).status).toBe(401);
  });

  it("returns 404 when the team belongs to another user", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValueOnce({ ...ownerTeam, userId: "other" });
    expect((await DELETE(del(), p10)).status).toBe(404);
  });

  it("returns 204 on successful delete", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(ownerTeam);
    const res = await DELETE(del(), p10);
    expect(res.status).toBe(204);
    expect(vi.mocked(prisma.team.delete)).toHaveBeenCalledWith({ where: { id: 10 } });
  });
});
