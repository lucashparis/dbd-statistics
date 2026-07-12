import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTeamStreaks } from "@/hooks/useTeamStreaks";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function ts(id: number, current: number) {
  return {
    team: { id, name: `T${id}`, createdAt: "2024-01-01T00:00:00.000Z", members: [] },
    currentStreak: current,
    bestStreak: current,
    totalMatches: current,
    wins: current,
    losses: 0,
    winRate: 100,
    matches: [],
  };
}

const mockFetch = vi.fn();
function res(status: number, data?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

describe("useTeamStreaks", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("fetches streaks when the tab becomes active", async () => {
    mockFetch.mockResolvedValueOnce(res(200, [ts(1, 2)]));
    const { result } = renderHook(() => useTeamStreaks(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.teamStreaks).toHaveLength(1);
  });

  it("launchMatch updates the team streak in place", async () => {
    mockFetch.mockResolvedValueOnce(res(200, [ts(1, 2)]));
    const { result } = renderHook(() => useTeamStreaks(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce(res(201, ts(1, 3)));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.launchMatch(1, 9, "win");
    });
    expect(ok).toBe(true);
    expect(result.current.teamStreaks[0].currentStreak).toBe(3);
  });

  it("launchMatch returns false on a server error", async () => {
    mockFetch.mockResolvedValueOnce(res(200, []));
    const { result } = renderHook(() => useTeamStreaks(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce(res(500, {}));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.launchMatch(1, 9, "win");
    });
    expect(ok).toBe(false);
  });
});
