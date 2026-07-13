import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { useKillers } from "@/hooks/useKillers";
import { createQueryWrapper } from "@/test/queryWrapper";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const killerFixture = {
  id: 1,
  name: "Trapper",
  imageUrl: "https://example.com/trapper.png",
  wins: 6,
  losses: 4,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockFetch = vi.fn();

// Route GET /api/killers (list refetch after invalidation) vs the PATCH mutation
// endpoints. `patchOk` decides whether the mutation succeeds.
function routeFetch(listAfter: typeof killerFixture[], patchOk: boolean) {
  mockFetch.mockImplementation((url: string) => {
    if (url === "/api/killers") {
      return Promise.resolve({ ok: true, json: async () => listAfter });
    }
    return Promise.resolve({
      ok: patchOk,
      json: async () => ({ ...killerFixture, wins: 7 }),
    });
  });
}

describe("useKillers", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("initializes with computed stats from initialKillers", () => {
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useKillers([killerFixture]), { wrapper: Wrapper });
    expect(result.current.killers).toHaveLength(1);
    expect(result.current.killers[0].total).toBe(10);
    expect(result.current.killers[0].winRate).toBe(60);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("registerWin optimistically increments and confirms with the server", async () => {
    routeFetch([{ ...killerFixture, wins: 7 }], true);
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useKillers([killerFixture]), { wrapper: Wrapper });

    await act(async () => {
      await result.current.registerWin(1);
    });

    await waitFor(() => expect(result.current.killers[0].wins).toBe(7));
    expect(result.current.killers[0].total).toBe(11);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("rolls back and toasts when registerWin fails", async () => {
    routeFetch([killerFixture], false);
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useKillers([killerFixture]), { wrapper: Wrapper });

    await act(async () => {
      await result.current.registerWin(1);
    });

    await waitFor(() => expect(result.current.killers[0].wins).toBe(6));
    expect(toast.error).toHaveBeenCalledWith("Failed to register win");
  });

  it("registerLoss optimistically increments losses", async () => {
    routeFetch([{ ...killerFixture, losses: 5 }], true);
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useKillers([killerFixture]), { wrapper: Wrapper });

    await act(async () => {
      await result.current.registerLoss(1);
    });

    await waitFor(() => expect(result.current.killers[0].losses).toBe(5));
  });

  it("undoWin optimistically decrements wins", async () => {
    routeFetch([{ ...killerFixture, wins: 5 }], true);
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useKillers([killerFixture]), { wrapper: Wrapper });

    await act(async () => {
      await result.current.undoWin(1);
    });

    await waitFor(() => expect(result.current.killers[0].wins).toBe(5));
  });

  it("fetchKillers refetches the list from the server", async () => {
    routeFetch([{ ...killerFixture, wins: 9 }], true);
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useKillers([killerFixture]), { wrapper: Wrapper });

    await act(async () => {
      await result.current.fetchKillers();
    });

    await waitFor(() => expect(result.current.killers[0].wins).toBe(9));
  });
});
