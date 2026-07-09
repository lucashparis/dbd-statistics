import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStreaks } from "@/hooks/useStreaks";
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
    const { result } = renderHook(() => useStreaks(0));
    expect(result.current.streaks.global).toEqual(EMPTY_GLOBAL);
    expect(result.current.loading).toBe(true);
  });

  it("populates streaks after fetching", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => fixture });
    const { result } = renderHook(() => useStreaks(1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.streaks).toEqual(fixture);
  });

  it("re-fetches when the signal changes", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fixture });
    const { rerender } = renderHook(({ signal }) => useStreaks(signal), {
      initialProps: { signal: 1 },
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    rerender({ signal: 2 });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  it("does not re-fetch when the signal is unchanged", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fixture });
    const { rerender } = renderHook(({ signal }) => useStreaks(signal), {
      initialProps: { signal: 5 },
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    rerender({ signal: 5 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to empty streaks when the response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    });
    const { result } = renderHook(() => useStreaks(1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.streaks.global).toEqual(EMPTY_GLOBAL);
    expect(result.current.streaks.perKiller).toEqual({});
  });

  it("falls back to empty streaks when fetch rejects", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useStreaks(2));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.streaks.global).toEqual(EMPTY_GLOBAL);
  });
});
