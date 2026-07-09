import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/history/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    match: { findMany: vi.fn(), count: vi.fn() },
  },
}));

const matchFixture = {
  id: 1,
  killerId: 1,
  result: "win" as const,
  createdAt: new Date(),
  killer: { id: 1, name: "Trapper", imageUrl: "" },
};

function req(page?: number) {
  const url = page
    ? `http://localhost/api/history?page=${page}`
    : "http://localhost/api/history";
  return new Request(url);
}

function reqRaw(query: string) {
  return new Request(`http://localhost/api/history?page=${query}`);
}

describe("GET /api/history", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns page 1 by default when no page param is provided", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([matchFixture]);
    vi.mocked(prisma.match.count).mockResolvedValueOnce(1);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matches).toHaveLength(1);
  });

  it("uses the provided page number to skip results", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([matchFixture]);
    vi.mocked(prisma.match.count).mockResolvedValueOnce(15);
    await GET(req(2));
    expect(vi.mocked(prisma.match.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10 })
    );
  });

  it("returns hasMore true when more results exist beyond current page", async () => {
    const tenMatches = Array.from({ length: 10 }, (_, i) => ({
      ...matchFixture,
      id: i + 1,
    }));
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce(tenMatches);
    vi.mocked(prisma.match.count).mockResolvedValueOnce(25);
    const res = await GET(req(1));
    const body = await res.json();
    expect(body.hasMore).toBe(true);
  });

  it("returns hasMore false when on the last page", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValueOnce([matchFixture]);
    vi.mocked(prisma.match.count).mockResolvedValueOnce(1);
    const res = await GET(req(1));
    const body = await res.json();
    expect(body.hasMore).toBe(false);
  });

  it.each(["abc", "-3", "0", "", "NaN"])(
    "falls back to page 1 (skip 0) for invalid page %j instead of crashing",
    async (value) => {
      vi.mocked(prisma.match.findMany).mockResolvedValueOnce([matchFixture]);
      vi.mocked(prisma.match.count).mockResolvedValueOnce(1);
      const res = await GET(reqRaw(value));
      expect(res.status).toBe(200);
      expect(vi.mocked(prisma.match.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 })
      );
    }
  );

  it("returns 500 when the database query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.match.findMany).mockRejectedValueOnce(new Error("db down"));
    vi.mocked(prisma.match.count).mockResolvedValueOnce(0);
    const res = await GET(req(1));
    expect(res.status).toBe(500);
  });
});
