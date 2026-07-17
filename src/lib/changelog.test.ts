import { describe, it, expect } from "vitest";
import { getChangelogEntries, formatChangelogDate } from "@/lib/changelog";

describe("getChangelogEntries", () => {
  it("returns entries sorted by date descending", () => {
    const entries = getChangelogEntries();
    const dates = entries.map((e) => e.date);
    const sorted = [...dates].sort((a, b) => b.localeCompare(a));
    expect(dates).toEqual(sorted);
    expect(entries[0].date >= entries[entries.length - 1].date).toBe(true);
  });

  it("exposes every required field non-empty", () => {
    for (const entry of getChangelogEntries()) {
      expect(entry.id).toBeTruthy();
      expect(entry.feature).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.requestedBy).toBeTruthy();
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(entry.date).getTime())).toBe(false);
    }
  });

  it("has unique ids", () => {
    const ids = getChangelogEntries().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns a fresh array (does not mutate the source)", () => {
    const first = getChangelogEntries();
    first.push({
      id: "x",
      feature: "x",
      date: "2000-01-01",
      description: "x",
      requestedBy: "x",
    });
    expect(getChangelogEntries().some((e) => e.id === "x")).toBe(false);
  });
});

describe("formatChangelogDate", () => {
  it("formats a valid ISO date in pt-BR", () => {
    expect(formatChangelogDate("2026-07-14")).toBe("14 de julho de 2026");
  });

  it("falls back to the raw string on an invalid date", () => {
    expect(formatChangelogDate("not-a-date")).toBe("not-a-date");
  });
});
