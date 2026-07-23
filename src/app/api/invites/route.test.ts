import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/invites/route";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getInvitesForUser } from "@/lib/crews";

vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/crews", () => ({ getInvitesForUser: vi.fn() }));

describe("GET /api/invites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue("u2");
    vi.mocked(getInvitesForUser).mockResolvedValue([]);
  });

  it("401 when unauthenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);
  });

  it("returns the pending invites", async () => {
    vi.mocked(getInvitesForUser).mockResolvedValueOnce([{ id: 1 }] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1 }]);
  });
});
