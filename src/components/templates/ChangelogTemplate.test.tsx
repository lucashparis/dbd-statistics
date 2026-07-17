import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChangelogTemplate } from "@/components/templates/ChangelogTemplate";
import type { ChangelogEntry } from "@/types/changelog";

const entries: ChangelogEntry[] = [
  {
    id: "a",
    feature: "Feature A",
    date: "2026-07-14",
    description: "Does A.",
    requestedBy: "Community",
  },
  {
    id: "b",
    feature: "Feature B",
    date: "2026-04-27",
    description: "Does B.",
    requestedBy: "Community",
  },
];

describe("ChangelogTemplate", () => {
  it("renders the page title", () => {
    render(<ChangelogTemplate entries={entries} />);
    expect(screen.getByRole("heading", { level: 1, name: /what's new/i })).toBeInTheDocument();
  });

  it("renders one card per entry", () => {
    render(<ChangelogTemplate entries={entries} />);
    expect(screen.getByRole("heading", { name: "Feature A" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Feature B" })).toBeInTheDocument();
  });

  it("shows an empty state when there are no entries", () => {
    render(<ChangelogTemplate entries={[]} />);
    expect(screen.getByText("No updates yet")).toBeInTheDocument();
  });
});
