import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCrews } from "@/hooks/useCrews";
import { createQueryWrapper } from "@/test/queryWrapper";
import type { Crew } from "@/types/crew";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function crew(id: number, over: Partial<Crew> = {}): Crew {
  return {
    id,
    name: `Crew ${id}`,
    writePolicy: "allMembers",
    ownerId: "u1",
    isOwner: true,
    isReady: true,
    canWrite: true,
    members: [],
    currentStreak: 0,
    bestStreak: 0,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    matches: [],
    ...over,
  };
}

const mockFetch = vi.fn();
function res(status: number, data?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

describe("useCrews", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("loads crews when active", async () => {
    mockFetch.mockResolvedValueOnce(res(200, [crew(1)]));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCrews(true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.crews).toHaveLength(1);
  });

  it("creates a crew and appends it to the cache", async () => {
    mockFetch.mockResolvedValueOnce(res(200, [])); // initial list
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCrews(true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce(res(201, crew(2, { name: "New" })));
    let ok = false;
    await act(async () => {
      ok = await result.current.createCrew({ name: "New", inviteeUserIds: [], writePolicy: "allMembers" });
    });
    expect(ok).toBe(true);
    await waitFor(() => expect(result.current.crews.some((c) => c.id === 2)).toBe(true));
  });

  it("logs a match and upserts the returned crew", async () => {
    mockFetch.mockResolvedValueOnce(res(200, [crew(1, { currentStreak: 0 })]));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCrews(true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce(res(201, crew(1, { currentStreak: 1 })));
    let ok = false;
    await act(async () => {
      ok = await result.current.logMatch(1, 9, "win");
    });
    expect(ok).toBe(true);
    await waitFor(() => expect(result.current.crews[0].currentStreak).toBe(1));
  });

  it("returns false when logging is forbidden", async () => {
    mockFetch.mockResolvedValueOnce(res(200, [crew(1)]));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCrews(true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce(res(403));
    let ok = true;
    await act(async () => {
      ok = await result.current.logMatch(1, 9, "win");
    });
    expect(ok).toBe(false);
  });
});
