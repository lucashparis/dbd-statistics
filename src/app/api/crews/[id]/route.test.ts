import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/crews/[id]/route";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getCrewDetail } from "@/lib/crews";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/crews", () => ({ getCrewDetail: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { crew: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() } },
}));

const params = { params: Promise.resolve({ id: "1" }) };
function patch(body: unknown) {
  return new Request("http://localhost/api/crews/1", { method: "PATCH", body: JSON.stringify(body) });
}

describe("/api/crews/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    vi.mocked(prisma.crew.findUnique).mockResolvedValue({ ownerId: "u1" } as never);
    vi.mocked(getCrewDetail).mockResolvedValue({ id: 1 } as never);
  });

  it("GET 404 when the viewer is not a member", async () => {
    vi.mocked(getCrewDetail).mockResolvedValueOnce(null);
    expect((await GET(new Request("http://localhost/api/crews/1"), params)).status).toBe(404);
  });

  it("GET returns the crew detail", async () => {
    expect((await GET(new Request("http://localhost/api/crews/1"), params)).status).toBe(200);
  });

  it("PATCH 403 when a non-owner tries to change policy", async () => {
    vi.mocked(prisma.crew.findUnique).mockResolvedValueOnce({ ownerId: "other" } as never);
    expect((await PATCH(patch({ writePolicy: "hostOnly" }), params)).status).toBe(403);
  });

  it("PATCH updates the write policy for the owner", async () => {
    const res = await PATCH(patch({ writePolicy: "hostOnly" }), params);
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.crew.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: { writePolicy: "hostOnly" } })
    );
  });

  it("DELETE 403 for non-owner", async () => {
    vi.mocked(prisma.crew.findUnique).mockResolvedValueOnce({ ownerId: "other" } as never);
    expect((await DELETE(new Request("http://localhost/api/crews/1"), params)).status).toBe(403);
  });

  it("DELETE 204 for the owner", async () => {
    expect((await DELETE(new Request("http://localhost/api/crews/1"), params)).status).toBe(204);
  });
});
