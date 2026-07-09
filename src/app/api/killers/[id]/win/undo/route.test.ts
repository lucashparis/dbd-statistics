import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/killers/[id]/win/undo/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => {
  const prisma = {
    killer: { findUnique: vi.fn(), update: vi.fn() },
    match: { findFirst: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) =>
    cb(prisma)
  );
  return { prisma };
});

const killerFixture = {
  id: 1,
  name: "Trapper",
  imageUrl: "https://example.com/trapper.png",
  wins: 5,
  losses: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function req() {
  return new Request("http://localhost/api/killers/1/win/undo", { method: "PATCH" });
}

describe("PATCH /api/killers/[id]/win/undo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when id is not a number", async () => {
    const res = await PATCH(req(), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when killer does not exist", async () => {
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(null);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 with unchanged killer when wins is already 0", async () => {
    const zeroWins = { ...killerFixture, wins: 0 };
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(zeroWins);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.wins).toBe(0);
    expect(vi.mocked(prisma.killer.update)).not.toHaveBeenCalled();
  });

  it("returns 200 with decremented wins on success", async () => {
    const updated = { ...killerFixture, wins: 4 };
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(killerFixture);
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.killer.update).mockResolvedValueOnce(updated);
    const res = await PATCH(req(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.wins).toBe(4);
  });

  it("deletes the matching win before decrementing the counter", async () => {
    const updated = { ...killerFixture, wins: 4 };
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(killerFixture);
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({
      id: 42,
      killerId: 1,
      result: "win",
      createdAt: new Date(),
    });
    vi.mocked(prisma.killer.update).mockResolvedValueOnce(updated);

    const res = await PATCH(req(), { params: Promise.resolve({ id: "1" }) });

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.match.delete)).toHaveBeenCalledWith({ where: { id: 42 } });
    expect(vi.mocked(prisma.killer.update)).toHaveBeenCalled();
  });

  it("does not decrement the counter when the match deletion fails (atomic)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.killer.findUnique).mockResolvedValueOnce(killerFixture);
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({
      id: 42,
      killerId: 1,
      result: "win",
      createdAt: new Date(),
    });
    vi.mocked(prisma.match.delete).mockRejectedValueOnce(new Error("db down"));

    const res = await PATCH(req(), { params: Promise.resolve({ id: "1" }) });

    expect(res.status).toBe(500);
    expect(vi.mocked(prisma.killer.update)).not.toHaveBeenCalled();
  });
});
