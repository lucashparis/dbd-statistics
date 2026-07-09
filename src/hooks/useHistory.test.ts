import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useHistory } from "@/hooks/useHistory";
import type { Match } from "@/types/killer";

const matchFixture: Match = {
  id: 1,
  killerId: 1,
  result: "win",
  createdAt: "2024-01-01T00:00:00.000Z",
  killer: { id: 1, name: "Trapper", imageUrl: "" },
};

const mockFetch = vi.fn();

describe("useHistory", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("does not fetch when isActive is false", () => {
    renderHook(() => useHistory(false));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches page 1 on first activation and populates matches", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ matches: [matchFixture], total: 1, hasMore: false }),
    });
    const { result } = renderHook(() => useHistory(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.matches).toHaveLength(1);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("loadMore appends next page results", async () => {
    const m2: Match = { ...matchFixture, id: 2 };
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ matches: [matchFixture], total: 2, hasMore: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ matches: [m2], total: 2, hasMore: false }),
      });

    const { result } = renderHook(() => useHistory(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.loadingMore).toBe(false));

    expect(result.current.matches).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);
  });

  it("re-fetches from page 1 when re-activated", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ matches: [matchFixture], total: 1, hasMore: false }),
    });

    const { rerender } = renderHook(
      ({ isActive }: { isActive: boolean }) => useHistory(isActive),
      { initialProps: { isActive: false } }
    );
    expect(mockFetch).not.toHaveBeenCalled();

    rerender({ isActive: true });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  });

  it("surfaces an error without crashing when the response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    });
    const { result } = renderHook(() => useHistory(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Could not load match history.");
    expect(result.current.matches).toHaveLength(0);
    expect(result.current.hasMore).toBe(false);
  });

  it("surfaces an error when fetch rejects", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useHistory(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Could not load match history.");
    expect(result.current.matches).toHaveLength(0);
  });

  it("retry clears the error and reloads page 1", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ matches: [matchFixture], total: 1, hasMore: false }),
      });

    const { result } = renderHook(() => useHistory(true));
    await waitFor(() =>
      expect(result.current.error).toBe("Could not load match history.")
    );

    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.matches).toHaveLength(1);
  });
});
