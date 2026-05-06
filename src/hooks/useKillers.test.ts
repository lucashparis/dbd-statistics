import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKillers } from "@/hooks/useKillers";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

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

describe("useKillers", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("initializes with computed stats from initialKillers", () => {
    const { result } = renderHook(() => useKillers([killerFixture]));
    expect(result.current.killers).toHaveLength(1);
    expect(result.current.killers[0].total).toBe(10);
    expect(result.current.killers[0].winRate).toBe(60);
  });

  it("fetchKillers updates killers list on success", async () => {
    const updated = { ...killerFixture, wins: 7 };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [updated] });
    const { result } = renderHook(() => useKillers([killerFixture]));
    await act(async () => {
      await result.current.fetchKillers();
    });
    expect(result.current.killers[0].wins).toBe(7);
    expect(result.current.error).toBeNull();
  });

  it("fetchKillers sets error on failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const { result } = renderHook(() => useKillers([killerFixture]));
    await act(async () => {
      await result.current.fetchKillers();
    });
    expect(result.current.error).toBe("Failed to fetch killers");
  });

  it("registerWin updates the matching killer on success", async () => {
    const updated = { ...killerFixture, wins: 7 };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => updated });
    const { result } = renderHook(() => useKillers([killerFixture]));
    await act(async () => {
      await result.current.registerWin(1);
    });
    expect(result.current.killers[0].wins).toBe(7);
  });

  it("registerWin sets error on failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const { result } = renderHook(() => useKillers([killerFixture]));
    await act(async () => {
      await result.current.registerWin(1);
    });
    expect(result.current.error).toBe("Failed to register win");
  });

  it("registerLoss updates the matching killer on success", async () => {
    const updated = { ...killerFixture, losses: 5 };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => updated });
    const { result } = renderHook(() => useKillers([killerFixture]));
    await act(async () => {
      await result.current.registerLoss(1);
    });
    expect(result.current.killers[0].losses).toBe(5);
  });

  it("registerLoss sets error on failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const { result } = renderHook(() => useKillers([killerFixture]));
    await act(async () => {
      await result.current.registerLoss(1);
    });
    expect(result.current.error).toBe("Failed to register loss");
  });

  it("undoWin updates killer on success", async () => {
    const updated = { ...killerFixture, wins: 5 };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => updated });
    const { result } = renderHook(() => useKillers([killerFixture]));
    await act(async () => {
      await result.current.undoWin(1);
    });
    expect(result.current.killers[0].wins).toBe(5);
  });

  it("undoLoss updates killer on success", async () => {
    const updated = { ...killerFixture, losses: 3 };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => updated });
    const { result } = renderHook(() => useKillers([killerFixture]));
    await act(async () => {
      await result.current.undoLoss(1);
    });
    expect(result.current.killers[0].losses).toBe(3);
  });
});
