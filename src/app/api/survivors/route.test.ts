import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { GET } from "@/app/api/survivors/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    survivor: { findMany: vi.fn() },
  },
}));

const SESSION: Session = { user: { id: "u1" }, expires: "2999-01-01T00:00:00.000Z" };
const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);
const survivorRow = { id: 1, name: "Dwight Fairfield", imageUrl: "https://example.com/dwight.png" };

describe("GET /api/survivors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(SESSION);
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);
  });

  it("returns 200 with the survivor list ordered by name", async () => {
    vi.mocked(prisma.survivor.findMany).mockResolvedValueOnce([survivorRow] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([survivorRow]);
    expect(vi.mocked(prisma.survivor.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: "asc" } })
    );
  });

  it("returns 500 when the database throws", async () => {
    vi.mocked(prisma.survivor.findMany).mockRejectedValueOnce(new Error("DB error"));
    expect((await GET()).status).toBe(500);
  });
});
