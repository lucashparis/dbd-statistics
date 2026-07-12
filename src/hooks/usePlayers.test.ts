import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePlayers } from "@/hooks/usePlayers";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const player = { id: 1, name: "Lucas", nick: "OldDead", createdAt: "2024-01-01T00:00:00.000Z" };
const mockFetch = vi.fn();

function res(status: number, data?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

describe("usePlayers", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("does not fetch when the tab is inactive", () => {
    renderHook(() => usePlayers(false));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches players when the tab becomes active", async () => {
    mockFetch.mockResolvedValueOnce(res(200, [player]));
    const { result } = renderHook(() => usePlayers(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toHaveLength(1);
  });

  it("addPlayer appends the created player and returns true", async () => {
    mockFetch.mockResolvedValueOnce(res(200, []));
    const { result } = renderHook(() => usePlayers(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce(res(201, player));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.addPlayer("Lucas", "OldDead");
    });
    expect(ok).toBe(true);
    expect(result.current.players).toHaveLength(1);
  });

  it("addPlayer returns false when the nick is taken (409)", async () => {
    mockFetch.mockResolvedValueOnce(res(200, []));
    const { result } = renderHook(() => usePlayers(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce(res(409, { error: "taken" }));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.addPlayer("Lucas", "OldDead");
    });
    expect(ok).toBe(false);
    expect(result.current.players).toHaveLength(0);
  });

  it("deletePlayer removes the player on success", async () => {
    mockFetch.mockResolvedValueOnce(res(200, [player]));
    const { result } = renderHook(() => usePlayers(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce(res(204));
    await act(async () => {
      await result.current.deletePlayer(1);
    });
    expect(result.current.players).toHaveLength(0);
  });
});
