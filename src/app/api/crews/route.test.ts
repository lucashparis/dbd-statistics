import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { GET, POST } from "@/app/api/crews/route";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getCrewsForUser, getCrewDetail, resolveInvitees } from "@/lib/crews";
import { NextResponse } from "next/server";
import { blockIfBanned } from "@/lib/ban";
import { BAN_CODE } from "@/lib/ban-message";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/crews", () => ({
  getCrewsForUser: vi.fn(),
  getCrewDetail: vi.fn(),
  resolveInvitees: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { crew: { create: vi.fn() } } }));
vi.mock("@/lib/ban", () => ({
  blockIfBanned: vi.fn(async () => null),
  isBanned: vi.fn(async () => false),
}));

function post(body: unknown) {
  return new Request("http://localhost/api/crews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/crews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    vi.mocked(resolveInvitees).mockResolvedValue({ ok: true, ids: ["u2"] });
    vi.mocked(prisma.crew.create).mockResolvedValue({ id: 1 } as never);
    vi.mocked(getCrewDetail).mockResolvedValue({ id: 1, name: "Alpha" } as never);
    vi.mocked(getCrewsForUser).mockResolvedValue([]);
  });

  it("POST returns the ban 403 — a banned user cannot host a crew", async () => {
    vi.mocked(blockIfBanned).mockResolvedValueOnce(
      NextResponse.json({ code: BAN_CODE }, { status: 403 })
    );
    const res = await POST(post({ name: "Alpha" }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe(BAN_CODE);
    expect(vi.mocked(prisma.crew.create)).not.toHaveBeenCalled();
  });

  it("GET returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await GET(new Request("http://localhost/api/crews"))).status).toBe(401);
  });

  it("GET lists crews", async () => {
    vi.mocked(getCrewsForUser).mockResolvedValueOnce([{ id: 1 }] as never);
    const res = await GET(new Request("http://localhost/api/crews?season=all"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1 }]);
    expect(vi.mocked(getCrewsForUser)).toHaveBeenCalledWith("u1", "all", false);
  });

  it("GET scopes the crew list to the requested season", async () => {
    vi.mocked(getCrewsForUser).mockResolvedValueOnce([] as never);
    await GET(new Request("http://localhost/api/crews?season=0"));
    expect(vi.mocked(getCrewsForUser)).toHaveBeenCalledWith("u1", 0, false);
  });

  it("POST returns 400 on invalid input", async () => {
    expect((await POST(post({ name: "" }))).status).toBe(400);
  });

  it("POST returns 400 when an invitee lacks a public profile", async () => {
    vi.mocked(resolveInvitees).mockResolvedValueOnce({ ok: false });
    expect((await POST(post({ name: "Alpha", inviteeUserIds: ["ghost"] }))).status).toBe(400);
  });

  it("POST returns 409 on a duplicate crew name", async () => {
    vi.mocked(prisma.crew.create).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "5" })
    );
    expect((await POST(post({ name: "Alpha" }))).status).toBe(409);
  });

  it("POST creates a crew with owner accepted + invitees pending", async () => {
    const res = await POST(post({ name: "Alpha", inviteeUserIds: ["u2"], writePolicy: "hostOnly" }));
    expect(res.status).toBe(201);
    const data = vi.mocked(prisma.crew.create).mock.calls[0][0].data as {
      writePolicy: string;
      members: { create: { userId: string; status?: string; isOwner?: boolean }[] };
    };
    expect(data.writePolicy).toBe("hostOnly");
    expect(data.members.create[0]).toMatchObject({ userId: "u1", status: "accepted", isOwner: true });
    expect(data.members.create[1]).toMatchObject({ userId: "u2" });
  });
});
