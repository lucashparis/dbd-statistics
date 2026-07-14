import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/profile/route";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { revalidateTag } from "next/cache";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    profile: { findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    killer: { findUnique: vi.fn() },
    survivor: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

function put(body: unknown) {
  return new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);
  });

  it("returns a non-public profile shell when none exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ name: "Lucas" } as never);
    vi.mocked(prisma.profile.findUnique).mockResolvedValueOnce(null);
    const body = await (await GET()).json();
    expect(body).toEqual({
      name: "Lucas",
      nick: "",
      channelUrl: null,
      mainKiller: null,
      mainSurv: null,
      isPublic: false,
    });
  });

  it("returns the public profile with its main killer", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ name: "Lucas" } as never);
    vi.mocked(prisma.profile.findUnique).mockResolvedValueOnce({
      nick: "dead",
      channelUrl: "https://twitch.tv/x",
      mainKiller: { id: 1, name: "Trapper", imageUrl: "https://x/t.png" },
    } as never);
    const body = await (await GET()).json();
    expect(body.isPublic).toBe(true);
    expect(body.nick).toBe("dead");
    expect(body.mainKiller.name).toBe("Trapper");
  });

  it("returns 500 when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(new Error("db down"));
    expect((await GET()).status).toBe(500);
  });
});

describe("PUT /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    vi.mocked(prisma.$transaction).mockImplementation(
      // run the callback against the mocked prisma client
      (async (cb: (tx: typeof prisma) => unknown) => cb(prisma)) as never
    );
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await PUT(put({ nick: "dead" }))).status).toBe(401);
  });

  it("returns 400 when nick is missing", async () => {
    expect((await PUT(put({ channelUrl: "https://x.com" }))).status).toBe(400);
  });

  it("returns 400 when the channel link is not https", async () => {
    expect((await PUT(put({ nick: "dead", channelUrl: "http://insecure.com" }))).status).toBe(400);
  });

  it("returns 404 when the main killer does not exist", async () => {
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(null);
    expect((await PUT(put({ nick: "dead", mainKillerId: 999 }))).status).toBe(404);
  });

  it("returns 404 when the main survivor does not exist", async () => {
    vi.mocked(prisma.survivor.findUnique).mockResolvedValueOnce(null);
    expect((await PUT(put({ nick: "dead", mainSurvId: 999 }))).status).toBe(404);
  });

  it("upserts the profile, updates the user name and revalidates caches", async () => {
    vi.mocked(prisma.user.update).mockResolvedValueOnce({ name: "Lucas" } as never);
    vi.mocked(prisma.profile.upsert).mockResolvedValueOnce({
      nick: "dead",
      channelUrl: "https://twitch.tv/x",
      mainKiller: null,
    } as never);

    const res = await PUT(put({ name: "Lucas", nick: "dead", channelUrl: "https://twitch.tv/x" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ name: "Lucas", nick: "dead", isPublic: true });

    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" }, data: { name: "Lucas" } })
    );
    expect(vi.mocked(prisma.profile.upsert)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } })
    );
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("community", "max");
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("profile:u1", "max");
  });

  it("returns 500 when the transaction fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error("db down") as never);
    expect((await PUT(put({ nick: "dead" }))).status).toBe(500);
  });
});

describe("DELETE /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await DELETE()).status).toBe(401);
  });

  it("removes the profile idempotently and revalidates caches", async () => {
    vi.mocked(prisma.profile.deleteMany).mockResolvedValueOnce({ count: 1 } as never);
    const res = await DELETE();
    expect(res.status).toBe(204);
    expect(vi.mocked(prisma.profile.deleteMany)).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("community", "max");
  });

  it("returns 500 when the delete fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.profile.deleteMany).mockRejectedValueOnce(new Error("db down"));
    expect((await DELETE()).status).toBe(500);
  });
});
