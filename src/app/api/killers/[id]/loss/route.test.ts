import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/killers/[id]/loss/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    killer: { update: vi.fn() },
    match: { create: vi.fn() },
  },
}));

const killerFixture = {
  id: 2,
  name: "Wraith",
  imageUrl: "https://example.com/wraith.png",
  wins: 3,
  losses: 8,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function req() {
  return new Request("http://localhost/api/killers/2/loss", {
    method: "PATCH",
  });
}

describe("PATCH /api/killers/[id]/loss", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when id is not a number", async () => {
    const res = await PATCH(req(), { params: Promise.resolve({ id: "xyz" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when killer does not exist", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error("not found"));
    const res = await PATCH(req(), { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 with updated killer on valid id", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([killerFixture, {}]);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "2" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(2);
    expect(body.losses).toBe(8);
  });
});
