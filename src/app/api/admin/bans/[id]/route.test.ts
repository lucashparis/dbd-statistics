import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { DELETE } from "@/app/api/admin/bans/[id]/route";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getBan } from "@/lib/ban";
import { revalidateTag } from "next/cache";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/ban", () => ({ getBan: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { ban: { findUnique: vi.fn(), update: vi.fn() } },
}));

const params = { params: Promise.resolve({ id: "b1" }) };
const req = () => new Request("http://localhost/api/admin/bans/b1", { method: "DELETE" });

describe("DELETE /api/admin/bans/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ userId: "admin1" });
    vi.mocked(prisma.ban.findUnique).mockResolvedValue({ liftedAt: null } as never);
    vi.mocked(prisma.ban.update).mockResolvedValue({ id: "b1" } as never);
    vi.mocked(getBan).mockResolvedValue({ id: "b1", liftedAt: "2026-08-10" } as never);
  });

  it("propagates the admin guard response", async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    });
    expect((await DELETE(req(), params)).status).toBe(404);
  });

  it("404s an unknown ban", async () => {
    vi.mocked(prisma.ban.findUnique).mockResolvedValueOnce(null as never);
    expect((await DELETE(req(), params)).status).toBe(404);
  });

  it("409s a ban that was already lifted", async () => {
    vi.mocked(prisma.ban.findUnique).mockResolvedValueOnce({ liftedAt: new Date() } as never);
    expect((await DELETE(req(), params)).status).toBe(409);
    expect(vi.mocked(prisma.ban.update)).not.toHaveBeenCalled();
  });

  it("keeps the row as history and stamps who lifted it", async () => {
    const res = await DELETE(req(), params);
    expect(res.status).toBe(200);
    const data = vi.mocked(prisma.ban.update).mock.calls[0][0].data as {
      liftedAt: Date;
      liftedById: string;
    };
    expect(data.liftedById).toBe("admin1");
    expect(data.liftedAt).toBeInstanceOf(Date);
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("community", "max");
  });

  it("500s when the update fails", async () => {
    vi.mocked(prisma.ban.update).mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await DELETE(req(), params)).status).toBe(500);
  });
});
