import { describe, it, expect, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateMatchDerived } from "@/lib/query-keys";

describe("invalidateMatchDerived", () => {
  it("invalidates every match-derived read, including community and rank", () => {
    const invalidateQueries = vi.fn();
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    invalidateMatchDerived(queryClient);

    const invalidated = invalidateQueries.mock.calls.map((c) => c[0].queryKey);
    // Invalidation is by first-segment prefix so both perspectives are busted.
    expect(invalidated).toEqual(
      expect.arrayContaining([["killers"], ["history"], ["streaks"], ["community"], ["rank"]])
    );
  });

  it("keys each match-derived read by perspective", () => {
    expect(queryKeys.killers("survivor")).toEqual(["killers", "survivor"]);
    expect(queryKeys.killers("killer")).toEqual(["killers", "killer"]);
    expect(queryKeys.history("killer")).toEqual(["history", "killer"]);
  });
});
