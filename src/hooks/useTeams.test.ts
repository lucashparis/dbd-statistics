import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTeams } from "@/hooks/useTeams";
import { createQueryWrapper } from "@/test/queryWrapper";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const team = {
  id: 10,
  name: "Alpha",
  createdAt: "2024-01-01T00:00:00.000Z",
  members: [{ id: 1, name: "Lucas", nick: "OldDead" }],
};
const mockFetch = vi.fn();

function res(status: number, data?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

describe("useTeams", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("fetches teams when the tab becomes active", async () => {
    mockFetch.mockResolvedValueOnce(res(200, [team]));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useTeams(true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.teams).toHaveLength(1);
    expect(result.current.teams[0].members[0].nick).toBe("OldDead");
  });

  it("createTeam appends the created team and returns true", async () => {
    mockFetch.mockResolvedValueOnce(res(200, []));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useTeams(true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce(res(201, team));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.createTeam("Alpha", [1]);
    });
    expect(ok).toBe(true);
    await waitFor(() => expect(result.current.teams).toHaveLength(1));
  });

  it("createTeam returns false when the name collides (409)", async () => {
    mockFetch.mockResolvedValueOnce(res(200, []));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useTeams(true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce(res(409, { error: "exists" }));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.createTeam("Alpha", [1]);
    });
    expect(ok).toBe(false);
    expect(result.current.teams).toHaveLength(0);
  });

  it("deleteTeam removes the team on success", async () => {
    mockFetch.mockResolvedValueOnce(res(200, [team]));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useTeams(true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce(res(204));
    await act(async () => {
      await result.current.deleteTeam(10);
    });
    await waitFor(() => expect(result.current.teams).toHaveLength(0));
  });
});
