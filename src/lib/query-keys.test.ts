import { describe, it, expect, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateMatchDerived } from "@/lib/query-keys";

describe("invalidateMatchDerived", () => {
  it("invalidates every match-derived read, including community and rank", () => {
    const invalidateQueries = vi.fn();
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    invalidateMatchDerived(queryClient);

    const invalidated = invalidateQueries.mock.calls.map((c) => c[0].queryKey);
    expect(invalidated).toEqual(
      expect.arrayContaining([
        queryKeys.killers,
        queryKeys.history,
        queryKeys.streaks,
        queryKeys.community,
        queryKeys.rank,
      ])
    );
  });
});
