import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/teams/route";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    team: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    player: { count: vi.fn() },
  },
}));

const teamWithMembers = {
  id: 10,
  name: "Alpha",
  createdAt: new Date(),
  members: [{ player: { id: 1, name: "Lucas", nick: "OldDead" } }],
};

function post(body: unknown) {
  return new Request("http://localhost/api/teams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/teams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);
  });

  it("returns serialized teams with members", async () => {
    vi.mocked(prisma.team.findMany).mockResolvedValueOnce([teamWithMembers] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].name).toBe("Alpha");
    expect(body[0].members[0].nick).toBe("OldDead");
  });
});

describe("POST /api/teams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await POST(post({ name: "Alpha", playerIds: [1] }))).status).toBe(401);
  });

  it("returns 400 when no players are provided", async () => {
    expect((await POST(post({ name: "Alpha", playerIds: [] }))).status).toBe(400);
  });

  it("returns 400 when more than 4 players are provided", async () => {
    expect((await POST(post({ name: "Alpha", playerIds: [1, 2, 3, 4, 5] }))).status).toBe(400);
  });

  it("returns 400 when a player is not owned by the user", async () => {
    vi.mocked(prisma.player.count).mockResolvedValueOnce(0);
    expect((await POST(post({ name: "Alpha", playerIds: [1] }))).status).toBe(400);
  });

  it("returns 409 when the team name already exists", async () => {
    vi.mocked(prisma.player.count).mockResolvedValueOnce(1);
    vi.mocked(prisma.team.findUnique).mockResolvedValueOnce({
      id: 10,
      userId: "u1",
      name: "Alpha",
      createdAt: new Date(),
    });
    expect((await POST(post({ name: "Alpha", playerIds: [1] }))).status).toBe(409);
  });

  it("returns 201 and creates the team with members", async () => {
    vi.mocked(prisma.player.count).mockResolvedValueOnce(1);
    vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.team.create).mockResolvedValueOnce(teamWithMembers as never);
    const res = await POST(post({ name: "Alpha", playerIds: [1] }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.members).toHaveLength(1);
  });
});
