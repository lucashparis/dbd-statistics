import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCommunity } from "@/hooks/useCommunity";
import { createQueryWrapper } from "@/test/queryWrapper";
import type { PublicProfileSummary } from "@/types/profile";

function summary(userId: string): PublicProfileSummary {
  return {
    userId,
    name: userId,
    nick: userId,
    channelUrl: null,
    mainKiller: null,
    mainSurv: null,
    stats: { total: 0, wins: 0, losses: 0, winRate: 0 },
  };
}

const mockFetch = vi.fn();
function res(status: number, data?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

describe("useCommunity", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("does not fetch when the tab is inactive", () => {
    const { Wrapper } = createQueryWrapper();
    renderHook(() => useCommunity(false), { wrapper: Wrapper });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("loads the first page when active", async () => {
    mockFetch.mockResolvedValueOnce(res(200, { profiles: [summary("a")], hasMore: true }));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCommunity(true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profiles).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);
  });

  it("loadMore appends the next page", async () => {
    mockFetch.mockResolvedValueOnce(res(200, { profiles: [summary("a")], hasMore: true }));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCommunity(true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce(res(200, { profiles: [summary("b")], hasMore: false }));
    await act(async () => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.profiles).toHaveLength(2));
    expect(result.current.hasMore).toBe(false);
  });

  it("surfaces an error when the request fails", async () => {
    mockFetch.mockResolvedValueOnce(res(500, { error: "boom" }));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCommunity(true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });
});
