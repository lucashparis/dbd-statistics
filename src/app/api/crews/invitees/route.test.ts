import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/crews/invitees/route";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { profile: { findMany: vi.fn() } } }));

const url = (q: string) => new Request(`http://localhost/api/crews/invitees?q=${q}`);

describe("GET /api/crews/invitees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    vi.mocked(prisma.profile.findMany).mockResolvedValue([]);
  });

  it("401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await GET(url("leo"))).status).toBe(401);
  });

  it("returns an empty list without hitting the DB for short queries", async () => {
    const res = await GET(url("a"));
    expect(await res.json()).toEqual([]);
    expect(prisma.profile.findMany).not.toHaveBeenCalled();
  });

  it("maps matching public profiles to invitees", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValueOnce([
      { userId: "u2", nick: "leo", user: { name: "Léo" }, mainKiller: { imageUrl: "x.webp" } },
    ] as never);
    const res = await GET(url("leo"));
    expect(await res.json()).toEqual([{ userId: "u2", nick: "leo", name: "Léo", imageUrl: "x.webp" }]);
  });
});
