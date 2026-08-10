import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { useAdminBans } from "@/hooks/useAdminBans";
import { createQueryWrapper } from "@/test/queryWrapper";
import type { BanView } from "@/types/ban";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

const activeBan: BanView = {
  id: "b1",
  userId: "u9",
  name: "Meno",
  nick: "menob7",
  reason: "Fake matches",
  createdAt: "2026-08-09T12:00:00.000Z",
  liftedAt: null,
  bannedBy: "paris",
};

const mockFetch = vi.fn();

describe("useAdminBans", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("does not fetch until the tab is active", () => {
    const { Wrapper } = createQueryWrapper();
    renderHook(() => useAdminBans(false), { wrapper: Wrapper });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("loads the ban list", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [activeBan] });
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useAdminBans(true), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.bans).toHaveLength(1));
    expect(result.current.error).toBeNull();
  });

  it("surfaces a load failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) });
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useAdminBans(true), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.error).toBe("Could not load the ban list."));
  });

  it("prepends a new ban to the cache", async () => {
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") return Promise.resolve({ ok: true, json: async () => activeBan });
      return Promise.resolve({ ok: true, json: async () => [] });
    });
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useAdminBans(true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.ban("u9", "Fake matches");
    });

    expect(ok).toBe(true);
    await waitFor(() => expect(result.current.bans.map((b) => b.id)).toContain("b1"));
    expect(toast.success).toHaveBeenCalled();
  });

  it("reports the 409 when the player is already banned", async () => {
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") return Promise.resolve({ ok: false, status: 409 });
      return Promise.resolve({ ok: true, json: async () => [] });
    });
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useAdminBans(true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.ban("u9", "again");
    });

    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("User is already on the ban list");
  });

  it("replaces the row in place when a ban is lifted", async () => {
    const lifted = { ...activeBan, liftedAt: "2026-08-10T00:00:00.000Z" };
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return Promise.resolve({ ok: true, json: async () => lifted });
      return Promise.resolve({ ok: true, json: async () => [activeBan] });
    });
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useAdminBans(true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.bans).toHaveLength(1));

    await act(async () => {
      await result.current.liftBan("b1");
    });

    await waitFor(() =>
      expect(result.current.bans[0].liftedAt).toBe("2026-08-10T00:00:00.000Z")
    );
    expect(result.current.bans).toHaveLength(1);
  });
});
