import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useInvites } from "@/hooks/useInvites";
import { createQueryWrapper } from "@/test/queryWrapper";
import type { Invite } from "@/types/crew";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const invite: Invite = {
  id: 5,
  crew: { id: 2, name: "Alpha" },
  invitedBy: { name: "Léo", nick: "leo" },
  invitedAt: "2024-01-01T00:00:00.000Z",
};

const mockFetch = vi.fn();
function res(status: number, data?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

describe("useInvites", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("exposes the pending invite count", async () => {
    mockFetch.mockResolvedValueOnce(res(200, [invite]));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useInvites(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.count).toBe(1);
  });

  it("removes the invite from the cache on accept", async () => {
    mockFetch.mockResolvedValueOnce(res(200, [invite]));
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useInvites(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.count).toBe(1));

    mockFetch.mockResolvedValueOnce(res(200, { ok: true }));
    await act(async () => {
      await result.current.accept(5);
    });
    await waitFor(() => expect(result.current.count).toBe(0));
  });
});
