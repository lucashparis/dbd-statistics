import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { GET, POST } from "@/app/api/admin/bans/route";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getBan, isBanned, listBans } from "@/lib/ban";
import { revalidateTag } from "next/cache";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/ban", () => ({ getBan: vi.fn(), isBanned: vi.fn(), listBans: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() }, ban: { create: vi.fn() } },
}));

const banView = { id: "b1", userId: "u9", nick: "menob7" };

function post(body: unknown) {
  return new Request("http://localhost/api/admin/bans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/bans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ userId: "admin1" });
    vi.mocked(listBans).mockResolvedValue([]);
    vi.mocked(isBanned).mockResolvedValue(false);
    vi.mocked(getBan).mockResolvedValue(banView as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u9" } as never);
    vi.mocked(prisma.ban.create).mockResolvedValue({ id: "b1" } as never);
  });

  it("GET propagates the admin guard response", async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    });
    expect((await GET()).status).toBe(404);
    expect(vi.mocked(listBans)).not.toHaveBeenCalled();
  });

  it("GET returns the ban list", async () => {
    vi.mocked(listBans).mockResolvedValueOnce([banView] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([banView]);
  });

  it("POST propagates the admin guard response", async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    expect((await POST(post({ userId: "u9", reason: "x" }))).status).toBe(401);
  });

  it("POST 400s an invalid body", async () => {
    expect((await POST(post({ userId: "u9" }))).status).toBe(400);
    expect((await POST(post({ userId: "u9", reason: "   " }))).status).toBe(400);
  });

  it("POST refuses a self-ban", async () => {
    const res = await POST(post({ userId: "admin1", reason: "oops" }));
    expect(res.status).toBe(400);
    expect(vi.mocked(prisma.ban.create)).not.toHaveBeenCalled();
  });

  it("POST 404s an unknown user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as never);
    expect((await POST(post({ userId: "ghost", reason: "x" }))).status).toBe(404);
  });

  it("POST 409s a user already on the list", async () => {
    vi.mocked(isBanned).mockResolvedValueOnce(true);
    expect((await POST(post({ userId: "u9", reason: "x" }))).status).toBe(409);
    expect(vi.mocked(prisma.ban.create)).not.toHaveBeenCalled();
  });

  it("POST records the ban with its issuer and busts the community cache", async () => {
    const res = await POST(post({ userId: "u9", reason: "  Fake matches  " }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(banView);
    expect(vi.mocked(prisma.ban.create).mock.calls[0][0].data).toEqual({
      userId: "u9",
      reason: "Fake matches",
      bannedById: "admin1",
    });
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("community", "max");
  });

  it("POST 500s when the write fails", async () => {
    vi.mocked(prisma.ban.create).mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(post({ userId: "u9", reason: "x" }))).status).toBe(500);
  });
});
