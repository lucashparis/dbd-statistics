import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChangelogEntryCard } from "@/components/molecules/ChangelogEntryCard";
import type { ChangelogEntry } from "@/types/changelog";

const entry: ChangelogEntry = {
  id: "win-streaks",
  feature: "Win streaks",
  date: "2026-07-04",
  description: "Track your current and best win streaks.",
  requestedBy: "Community",
};

describe("ChangelogEntryCard", () => {
  it("renders feature, description and requester", () => {
    render(<ChangelogEntryCard entry={entry} />);
    expect(screen.getByRole("heading", { name: "Win streaks" })).toBeInTheDocument();
    expect(screen.getByText("Track your current and best win streaks.")).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
  });

  it("renders a machine-readable date formatted in pt-BR", () => {
    render(<ChangelogEntryCard entry={entry} />);
    const time = screen.getByText("04 de julho de 2026");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("dateTime", "2026-07-04");
  });

  it("renders the requester as plain text when there is no user id", () => {
    render(<ChangelogEntryCard entry={entry} />);
    expect(screen.queryByRole("link", { name: "Community" })).not.toBeInTheDocument();
  });

  it("links the requester to their public profile when a user id is set", () => {
    render(
      <ChangelogEntryCard
        entry={{ ...entry, requestedBy: "dead", requestedByUserId: "u42" }}
      />
    );
    expect(screen.getByRole("link", { name: "dead" })).toHaveAttribute(
      "href",
      "/community/u42"
    );
  });
});
