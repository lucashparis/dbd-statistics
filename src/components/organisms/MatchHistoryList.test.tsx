import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MatchHistoryList } from "@/components/organisms/MatchHistoryList";
import type { Match } from "@/types/killer";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

const match: Match = {
  id: 1,
  killerId: 1,
  result: "win",
  createdAt: "2024-01-01T00:00:00.000Z",
  killer: { id: 1, name: "Trapper", imageUrl: "https://example.com/t.png" },
};

const baseProps = {
  matches: [] as Match[],
  hasMore: false,
  loading: false,
  loadingMore: false,
  onLoadMore: vi.fn(),
  onRetry: vi.fn(),
};

describe("MatchHistoryList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the empty state when there are no matches", () => {
    render(<MatchHistoryList {...baseProps} />);
    expect(screen.getByText("No matches recorded")).toBeInTheDocument();
  });

  it("renders the recorded matches", () => {
    render(<MatchHistoryList {...baseProps} matches={[match]} />);
    expect(screen.getByText("Trapper")).toBeInTheDocument();
    expect(screen.getByText("Victory")).toBeInTheDocument();
  });

  it("renders an error state with a retry button when loading fails with no matches", () => {
    render(
      <MatchHistoryList
        {...baseProps}
        error="Could not load match history."
      />
    );
    expect(screen.getByText("Couldn't load history")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(baseProps.onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows a retry affordance instead of Load more when a page fails mid-list", () => {
    render(
      <MatchHistoryList
        {...baseProps}
        matches={[match]}
        hasMore
        error="Could not load match history."
      />
    );
    expect(screen.getByText("Trapper")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Load more" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" })
    ).toBeInTheDocument();
  });

  it("renders a Load more button when there are more pages", () => {
    render(<MatchHistoryList {...baseProps} matches={[match]} hasMore />);
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(baseProps.onLoadMore).toHaveBeenCalledTimes(1);
  });
});
