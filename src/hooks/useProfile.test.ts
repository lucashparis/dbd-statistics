import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProfile } from "@/hooks/useProfile";
import { createQueryWrapper } from "@/test/queryWrapper";
import type { MyProfile } from "@/types/profile";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const profile: MyProfile = {
  name: "Lucas",
  nick: "dead",
  channelUrl: null,
  mainKiller: null,
  mainSurv: null,
  isPublic: true,
};
const mockFetch = vi.fn();

function res(status: number, data?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

async function mountLoaded() {
  mockFetch.mockResolvedValueOnce(res(200, profile));
  const { Wrapper } = createQueryWrapper();
  const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

describe("useProfile", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("loads the current user's profile", async () => {
    const result = await mountLoaded();
    expect(result.current.profile?.nick).toBe("dead");
    expect(result.current.profile?.isPublic).toBe(true);
  });

  it("saveProfile returns true and updates the cache on success", async () => {
    const result = await mountLoaded();
    mockFetch.mockResolvedValueOnce(res(200, { ...profile, nick: "newnick" }));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.saveProfile({ nick: "newnick" });
    });
    expect(ok).toBe(true);
    await waitFor(() => expect(result.current.profile?.nick).toBe("newnick"));
  });

  it("saveProfile returns false when the main killer is missing (404)", async () => {
    const result = await mountLoaded();
    mockFetch.mockResolvedValueOnce(res(404, { error: "gone" }));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.saveProfile({ nick: "x", mainKillerId: 999 });
    });
    expect(ok).toBe(false);
  });

  it("removeProfile issues a DELETE request", async () => {
    const result = await mountLoaded();
    mockFetch.mockResolvedValueOnce(res(204));
    await act(async () => {
      await result.current.removeProfile();
    });
    expect(mockFetch).toHaveBeenCalledWith("/api/profile", { method: "DELETE" });
  });
});
