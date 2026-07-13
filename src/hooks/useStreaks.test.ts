import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStreaks } from "@/hooks/useStreaks";
import { createQueryWrapper } from "@/test/queryWrapper";
import type { StreaksData } from "@/types/killer";

const fixture: StreaksData = {
  global: { longestWin: 4, longestLoss: 2 },
  perKiller: { 1: { longestWin: 3, longestLoss: 1 } },
};

const EMPTY_GLOBAL = { longestWin: 0, longestLoss: 0 };

const mockFetch = vi.fn();

describe("useStreaks", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("starts with empty streaks before the fetch resolves", () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useStreaks(), { wrapper: Wrapper });
    expect(result.current.streaks.global).toEqual(EMPTY_GLOBAL);
    expect(result.current.loading).toBe(true);
  });

  it("populates streaks after fetching", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => fixture });
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useStreaks(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.streaks).toEqual(fixture);
  });

  it("falls back to empty streaks when the response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    });
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useStreaks(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.streaks.global).toEqual(EMPTY_GLOBAL);
    expect(result.current.streaks.perKiller).toEqual({});
  });

  it("falls back to empty streaks when fetch rejects", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network"));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useStreaks(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.streaks.global).toEqual(EMPTY_GLOBAL);
  });
});
