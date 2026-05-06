import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/killers/[id]/win/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    killer: { update: vi.fn() },
    match: { create: vi.fn() },
  },
}));

const killerFixture = {
  id: 1,
  name: "Trapper",
  imageUrl: "https://example.com/trapper.png",
  wins: 6,
  losses: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function req() {
  return new Request("http://localhost/api/killers/1/win", { method: "PATCH" });
}

describe("PATCH /api/killers/[id]/win", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when id is not a number", async () => {
    const res = await PATCH(req(), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when killer does not exist", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error("not found"));
    const res = await PATCH(req(), { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 with updated killer on valid id", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([killerFixture, {}]);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(1);
    expect(body.wins).toBe(6);
  });
});
