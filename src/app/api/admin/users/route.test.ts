import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "@/app/api/admin/users/route";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

vi.mock("@/lib/admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { profile: { findMany: vi.fn() } } }));

const req = (q: string) => new Request(`http://localhost/api/admin/users?q=${q}`);

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ userId: "admin1" });
    vi.mocked(prisma.profile.findMany).mockResolvedValue([] as never);
  });

  it("propagates the admin guard response", async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    });
    expect((await GET(req("meno"))).status).toBe(404);
    expect(vi.mocked(prisma.profile.findMany)).not.toHaveBeenCalled();
  });

  it("returns an empty list below two characters instead of scanning", async () => {
    expect(await (await GET(req("m"))).json()).toEqual([]);
    expect(vi.mocked(prisma.profile.findMany)).not.toHaveBeenCalled();
  });

  it("flags players that are already banned and never selects email", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValueOnce([
      {
        userId: "u9",
        nick: "menob7",
        user: { name: "Meno", bans: [{ id: "b1" }] },
        mainKiller: { imageUrl: "/blight.webp" },
      },
      { userId: "u8", nick: "clean", user: { name: null, bans: [] }, mainKiller: null },
    ] as never);

    const res = await GET(req("me"));
    expect(await res.json()).toEqual([
      { userId: "u9", nick: "menob7", name: "Meno", imageUrl: "/blight.webp", isBanned: true },
      { userId: "u8", nick: "clean", name: null, imageUrl: null, isBanned: false },
    ]);

    const args = vi.mocked(prisma.profile.findMany).mock.calls[0][0];
    expect(JSON.stringify(args?.select)).not.toContain("email");
    expect(args?.where).toMatchObject({ userId: { not: "admin1" } });
  });
});
