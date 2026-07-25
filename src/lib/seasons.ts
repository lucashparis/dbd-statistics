// Seasons are derived purely from a match's `createdAt` — there is no `Season`
// table and no `seasonId` column. Season 1 opens at the anchor below; every
// boundary lands on the 15th at midnight Brasília time. Everything before the
// anchor is Season 0.
//
// Brasília is a fixed UTC-03:00 offset (Brazil abolished DST in 2019) and the
// anchor is 2026, so "midnight local" is always "03:00Z" — the arithmetic is
// exact without a date library.

export const SEASON_ZONE_OFFSET_HOURS = -3;
export const SEASON_LENGTH_MONTHS = 3;
export const SEASON_ANCHOR_YEAR = 2026;
export const SEASON_ANCHOR_MONTH = 6; // July, 0-indexed
export const SEASON_ANCHOR_DAY = 15;
export const SEASON_ANCHOR_MS = Date.UTC(
  SEASON_ANCHOR_YEAR,
  SEASON_ANCHOR_MONTH,
  SEASON_ANCHOR_DAY,
  -SEASON_ZONE_OFFSET_HOURS
);

export type SeasonSelection = number | "all";

// What gets persisted on `User.preferredSeason`: "current" tracks the rollover
// so a stored preference never rots, "all" is literal, and a number pins a
// specific past season.
export type SeasonPreference = "current" | "all" | (string & {});

export interface Season {
  id: number;
  label: string;
  start: Date | null;
  end: Date;
}

function zoneParts(date: Date): { year: number; month: number; day: number } {
  const shifted = new Date(date.getTime() + SEASON_ZONE_OFFSET_HOURS * 3_600_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

function boundaryAt(seasonId: number): Date {
  return new Date(
    Date.UTC(
      SEASON_ANCHOR_YEAR,
      SEASON_ANCHOR_MONTH + SEASON_LENGTH_MONTHS * (seasonId - 1),
      SEASON_ANCHOR_DAY,
      -SEASON_ZONE_OFFSET_HOURS
    )
  );
}

export function seasonIdForDate(date: Date): number {
  const { year, month, day } = zoneParts(date);
  const months =
    (year - SEASON_ANCHOR_YEAR) * 12 +
    (month - SEASON_ANCHOR_MONTH) -
    (day < SEASON_ANCHOR_DAY ? 1 : 0);
  return Math.max(0, Math.floor(months / SEASON_LENGTH_MONTHS) + 1);
}

export function currentSeasonId(now: Date = new Date()): number {
  return seasonIdForDate(now);
}

// Season 0 has no start — it is the open-ended past before the anchor.
export function seasonBoundaries(seasonId: number): { start: Date | null; end: Date } {
  if (seasonId <= 0) return { start: null, end: boundaryAt(1) };
  return { start: boundaryAt(seasonId), end: boundaryAt(seasonId + 1) };
}

export function seasonLabel(selection: SeasonSelection): string {
  return selection === "all" ? "All time" : `Season ${selection}`;
}

// Stable cache-key fragment for `unstable_cache` and TanStack query keys.
export function seasonKey(selection: SeasonSelection): string {
  return selection === "all" ? "all" : `s${selection}`;
}

export function isCurrentSeason(selection: SeasonSelection, now: Date = new Date()): boolean {
  return selection !== "all" && selection === currentSeasonId(now);
}

// A season is writable when a match created right now would land in it: the
// current season, or the unfiltered all-time view.
export function isWritableSeason(selection: SeasonSelection, now: Date = new Date()): boolean {
  return selection === "all" || isCurrentSeason(selection, now);
}

export function listSeasons(now: Date = new Date()): Season[] {
  const current = currentSeasonId(now);
  const seasons: Season[] = [];
  for (let id = current; id >= 0; id--) {
    const { start, end } = seasonBoundaries(id);
    seasons.push({ id, label: seasonLabel(id), start, end });
  }
  return seasons;
}

// The Prisma `where` fragment every season-scoped read composes. `all` yields an
// empty object so the query stays exactly as it was before seasons existed.
export function seasonWhere(selection: SeasonSelection): {
  createdAt?: { gte?: Date; lt?: Date };
} {
  if (selection === "all") return {};
  const { start, end } = seasonBoundaries(selection);
  return { createdAt: start ? { gte: start, lt: end } : { lt: end } };
}

// Resolves the stored intent into a concrete selection. "current" follows the
// rollover, so a preference saved in Season 1 opens Season 2 once it starts.
export function resolvePreferredSeason(
  preference: string | null | undefined,
  now: Date = new Date()
): SeasonSelection {
  if (preference === "all") return "all";
  const current = currentSeasonId(now);
  if (!preference || preference === "current") return current;
  const parsed = Number(preference);
  if (!Number.isInteger(parsed) || parsed < 0) return current;
  return Math.min(parsed, current);
}

// A `?season=` URL param accepts exactly the same shapes as a stored
// preference, so both resolve through one implementation.
export function parseSeasonParam(
  value: string | null | undefined,
  now: Date = new Date()
): SeasonSelection {
  return resolvePreferredSeason(value, now);
}

export function toPreference(
  selection: SeasonSelection,
  now: Date = new Date()
): SeasonPreference {
  if (selection === "all") return "all";
  return isCurrentSeason(selection, now) ? "current" : String(selection);
}
