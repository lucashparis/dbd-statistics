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
      json: async () => ({ matches: [matchFixture], total: 1, hasMore: false }),
    });
    const { result } = renderHook(() => useHistory(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.matches).toHaveLength(1);
    expect(result.current.hasMore).toBe(false);
  });

  it("loadMore appends next page results", async () => {
    const m2: Match = { ...matchFixture, id: 2 };
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ matches: [matchFixture], total: 2, hasMore: true }),
      })
      .mockResolvedValueOnce({
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
});
