import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRank } from "@/hooks/useRank";
import { createQueryWrapper } from "@/test/queryWrapper";
import type { RankEntry, RankMetric, RankPage, RankViewer } from "@/types/profile";

function entry(userId: string, rank: number): RankEntry {
  return {
    userId,
    name: userId,
    nick: userId,
    channelUrl: null,
    mainKiller: null,
    mainSurv: null,
    stats: { total: 40, wins: 20, losses: 20, winRate: 50 },
    rank,
  };
}

function pageData(entries: RankEntry[], hasMore: boolean, me: RankViewer | null = null): RankPage {
  return { entries, hasMore, me };
}

function ranked(userId: string, rank: number): RankViewer {
  return { status: "ranked", entry: entry(userId, rank) };
}

const mockFetch = vi.fn();
function res(status: number, data?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

describe("useRank", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("does not fetch when the tab is inactive", () => {
    const { Wrapper } = createQueryWrapper();
    renderHook(() => useRank(false, "matches", ""), { wrapper: Wrapper });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("loads the first page and exposes me from pages[0]", async () => {
    mockFetch.mockResolvedValueOnce(res(200, pageData([entry("a", 1)], true, ranked("a", 1))));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useRank(true, "matches", ""), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.me).toEqual(ranked("a", 1));
    expect(result.current.hasMore).toBe(true);
  });

  it("builds the request url from metric, search and page", async () => {
    mockFetch.mockResolvedValueOnce(res(200, pageData([], false)));
    const { Wrapper } = createQueryWrapper();
    renderHook(() => useRank(true, "winRate", "ne o"), { wrapper: Wrapper });
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("metric=winRate");
    expect(url).toContain("search=ne+o");
    expect(url).toContain("page=1");
  });

  it("loadMore appends the next page and keeps me from the first page", async () => {
    mockFetch.mockResolvedValueOnce(res(200, pageData([entry("a", 1)], true, ranked("a", 1))));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useRank(true, "matches", ""), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce(res(200, pageData([entry("b", 2)], false, ranked("a", 1))));
    await act(async () => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    expect(result.current.hasMore).toBe(false);
    expect(result.current.me).toEqual(ranked("a", 1));
  });

  it("surfaces an error when the request fails", async () => {
    mockFetch.mockResolvedValueOnce(res(500, { error: "boom" }));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useRank(true, "matches", ""), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });

  it("refetches under a distinct cache key when metric or search changes", async () => {
    mockFetch.mockResolvedValue(res(200, pageData([], false)));
    const { Wrapper } = createQueryWrapper();
    const { rerender } = renderHook(({ m, s }) => useRank(true, m, s), {
      wrapper: Wrapper,
      initialProps: { m: "matches" as RankMetric, s: "" },
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    rerender({ m: "wins" as RankMetric, s: "" });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    rerender({ m: "wins" as RankMetric, s: "abc" });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));
  });
});
