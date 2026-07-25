import { describe, it, expect, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateMatchDerived } from "@/lib/query-keys";

describe("invalidateMatchDerived", () => {
  it("invalidates every match-derived read, including crews, community and rank", () => {
    const invalidateQueries = vi.fn();
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    invalidateMatchDerived(queryClient);

    const invalidated = invalidateQueries.mock.calls.map((c) => c[0].queryKey);
    // Invalidation is by first-segment prefix so every perspective and season
    // variant is busted at once.
    expect(invalidated).toEqual(
      expect.arrayContaining([
        ["killers"],
        ["history"],
        ["streaks"],
        ["community"],
        ["rank"],
        ["crews"],
      ])
    );
  });

  it("keys each match-derived read by perspective and season", () => {
    expect(queryKeys.killers("survivor", 1)).toEqual(["killers", "survivor", "s1"]);
    expect(queryKeys.killers("killer", "all")).toEqual(["killers", "killer", "all"]);
    expect(queryKeys.history("killer", 0)).toEqual(["history", "killer", "s0"]);
    expect(queryKeys.crews(1)).toEqual(["crews", "s1"]);
  });

  it("never collides across seasons for the same perspective", () => {
    expect(queryKeys.killers("survivor", 1)).not.toEqual(queryKeys.killers("survivor", 0));
    expect(queryKeys.killers("survivor", "all")).not.toEqual(queryKeys.killers("survivor", 1));
  });
});
