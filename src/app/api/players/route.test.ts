import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/players/route";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { player: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() } },
}));

const player = { id: 1, userId: "u1", name: "Lucas", nick: "OldDead", createdAt: new Date() };

function post(body: unknown) {
  return new Request("http://localhost/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/players", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);
  });

  it("returns the current user's players", async () => {
    vi.mocked(prisma.player.findMany).mockResolvedValueOnce([player]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].nick).toBe("OldDead");
    expect(vi.mocked(prisma.player.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } })
    );
  });
});

describe("POST /api/players", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await POST(post({ name: "a", nick: "b" }))).status).toBe(401);
  });

  it("returns 400 on invalid input", async () => {
    expect((await POST(post({ name: "" }))).status).toBe(400);
  });

  it("returns 409 when the nick already exists", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValueOnce(player);
    expect((await POST(post({ name: "Lucas", nick: "OldDead" }))).status).toBe(409);
  });

  it("returns 201 and creates a player scoped to the user", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.player.create).mockResolvedValueOnce(player);
    const res = await POST(post({ name: "Lucas", nick: "OldDead" }));
    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.player.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "u1", name: "Lucas", nick: "OldDead" }) })
    );
  });
});
