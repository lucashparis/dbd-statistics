import { describe, it, expect } from "vitest";
import {
  SEASON_ANCHOR_MS,
  currentSeasonId,
  isCurrentSeason,
  isWritableSeason,
  listSeasons,
  resolvePreferredSeason,
  seasonBoundaries,
  seasonIdForDate,
  seasonKey,
  seasonLabel,
  seasonWhere,
  toPreference,
} from "@/lib/seasons";

const ANCHOR = new Date(SEASON_ANCHOR_MS);
const TODAY = new Date("2026-07-24T12:00:00.000Z");
const NOVEMBER = new Date("2026-11-02T12:00:00.000Z");

describe("season anchor", () => {
  it("is midnight of July 15 2026 in Brasília time", () => {
    expect(ANCHOR.toISOString()).toBe("2026-07-15T03:00:00.000Z");
  });
});

describe("seasonIdForDate", () => {
  it("puts the instant just before the anchor in season 0", () => {
    expect(seasonIdForDate(new Date("2026-07-15T02:59:59.999Z"))).toBe(0);
  });

  it("puts the anchor itself in season 1", () => {
    expect(seasonIdForDate(new Date("2026-07-15T03:00:00.000Z"))).toBe(1);
  });

  it("keeps a match played on July 14 at 23:00 Brasília in season 0", () => {
    // 2026-07-15T02:00:00Z is still the 14th on the player's wall clock.
    expect(seasonIdForDate(new Date("2026-07-15T02:00:00.000Z"))).toBe(0);
  });

  it("rolls into season 2 at the October boundary", () => {
    expect(seasonIdForDate(new Date("2026-10-15T02:59:59.999Z"))).toBe(1);
    expect(seasonIdForDate(new Date("2026-10-15T03:00:00.000Z"))).toBe(2);
  });

  it("crosses the year boundary into season 3", () => {
    expect(seasonIdForDate(new Date("2027-01-15T03:00:00.000Z"))).toBe(3);
    expect(seasonIdForDate(new Date("2027-04-15T03:00:00.000Z"))).toBe(4);
  });

  it("clamps far past dates to season 0", () => {
    expect(seasonIdForDate(new Date("2020-01-01T00:00:00.000Z"))).toBe(0);
    expect(seasonIdForDate(new Date("2025-07-15T03:00:00.000Z"))).toBe(0);
  });
});

describe("currentSeasonId", () => {
  it("is season 1 today", () => {
    expect(currentSeasonId(TODAY)).toBe(1);
  });

  it("is season 2 in November 2026", () => {
    expect(currentSeasonId(NOVEMBER)).toBe(2);
  });
});

describe("seasonBoundaries", () => {
  it("gives season 0 an open-ended past", () => {
    const { start, end } = seasonBoundaries(0);
    expect(start).toBeNull();
    expect(end.toISOString()).toBe("2026-07-15T03:00:00.000Z");
  });

  it("gives season 1 a three-month window", () => {
    const { start, end } = seasonBoundaries(1);
    expect(start?.toISOString()).toBe("2026-07-15T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-15T03:00:00.000Z");
  });

  it("keeps consecutive seasons contiguous with no gaps or overlaps", () => {
    for (let id = 1; id <= 8; id++) {
      expect(seasonBoundaries(id).end.getTime()).toBe(
        seasonBoundaries(id + 1).start?.getTime()
      );
    }
  });

  it("treats negative ids as season 0", () => {
    expect(seasonBoundaries(-2)).toEqual(seasonBoundaries(0));
  });
});

describe("seasonWhere", () => {
  it("returns no filter for all time", () => {
    expect(seasonWhere("all")).toEqual({});
  });

  it("returns only an upper bound for season 0", () => {
    expect(seasonWhere(0)).toEqual({
      createdAt: { lt: new Date("2026-07-15T03:00:00.000Z") },
    });
  });

  it("returns both bounds for a numbered season", () => {
    expect(seasonWhere(1)).toEqual({
      createdAt: {
        gte: new Date("2026-07-15T03:00:00.000Z"),
        lt: new Date("2026-10-15T03:00:00.000Z"),
      },
    });
  });
});

describe("listSeasons", () => {
  it("lists from the current season down to zero", () => {
    expect(listSeasons(TODAY).map((s) => s.id)).toEqual([1, 0]);
    expect(listSeasons(NOVEMBER).map((s) => s.id)).toEqual([2, 1, 0]);
  });

  it("labels each entry", () => {
    expect(listSeasons(TODAY).map((s) => s.label)).toEqual(["Season 1", "Season 0"]);
  });
});

describe("labels and keys", () => {
  it("labels the all-time selection", () => {
    expect(seasonLabel("all")).toBe("All time");
    expect(seasonLabel(0)).toBe("Season 0");
  });

  it("produces distinct stable cache keys", () => {
    expect(seasonKey("all")).toBe("all");
    expect(seasonKey(0)).toBe("s0");
    expect(seasonKey(1)).toBe("s1");
  });
});

describe("isCurrentSeason / isWritableSeason", () => {
  it("only the current numbered season is current", () => {
    expect(isCurrentSeason(1, TODAY)).toBe(true);
    expect(isCurrentSeason(0, TODAY)).toBe(false);
    expect(isCurrentSeason("all", TODAY)).toBe(false);
  });

  it("allows writes on the current season and on all time", () => {
    expect(isWritableSeason(1, TODAY)).toBe(true);
    expect(isWritableSeason("all", TODAY)).toBe(true);
    expect(isWritableSeason(0, TODAY)).toBe(false);
  });
});

describe("resolvePreferredSeason", () => {
  it("tracks the rollover when the intent is 'current'", () => {
    expect(resolvePreferredSeason("current", TODAY)).toBe(1);
    expect(resolvePreferredSeason("current", NOVEMBER)).toBe(2);
  });

  it("keeps a deliberately pinned past season", () => {
    expect(resolvePreferredSeason("0", TODAY)).toBe(0);
    expect(resolvePreferredSeason("0", NOVEMBER)).toBe(0);
  });

  it("keeps the all-time intent literal", () => {
    expect(resolvePreferredSeason("all", TODAY)).toBe("all");
  });

  it("falls back to the current season for missing or corrupt values", () => {
    expect(resolvePreferredSeason(null, TODAY)).toBe(1);
    expect(resolvePreferredSeason(undefined, TODAY)).toBe(1);
    expect(resolvePreferredSeason("", TODAY)).toBe(1);
    expect(resolvePreferredSeason("garbage", TODAY)).toBe(1);
    expect(resolvePreferredSeason("-1", TODAY)).toBe(1);
    expect(resolvePreferredSeason("1.5", TODAY)).toBe(1);
  });

  it("clamps a future season to the current one", () => {
    expect(resolvePreferredSeason("9", TODAY)).toBe(1);
  });
});

describe("toPreference", () => {
  it("stores the current season as an intent, not a number", () => {
    expect(toPreference(1, TODAY)).toBe("current");
  });

  it("stores all time literally", () => {
    expect(toPreference("all", TODAY)).toBe("all");
  });

  it("stores a pinned past season as its number", () => {
    expect(toPreference(0, TODAY)).toBe("0");
  });

  it("round-trips through resolvePreferredSeason across a rollover", () => {
    const stored = toPreference(1, TODAY);
    expect(resolvePreferredSeason(stored, NOVEMBER)).toBe(2);
  });
});
