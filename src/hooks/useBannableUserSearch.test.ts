import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useBannableUserSearch } from "@/hooks/useBannableUserSearch";
import { createQueryWrapper } from "@/test/queryWrapper";

const mockFetch = vi.fn();

const hit = { userId: "u9", nick: "menob7", name: "Meno", imageUrl: null, isBanned: false };

describe("useBannableUserSearch", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("does not query below two characters", () => {
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useBannableUserSearch("m"), { wrapper: Wrapper });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it("queries with the trimmed, encoded term", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [hit] });
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useBannableUserSearch("  me no  "), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.results).toEqual([hit]));
    expect(mockFetch).toHaveBeenCalledWith("/api/admin/users?q=me%20no");
  });

  it("returns an empty list when the search fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) });
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useBannableUserSearch("meno"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toEqual([]);
  });
});
