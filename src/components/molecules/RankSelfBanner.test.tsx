import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RankSelfBanner } from "@/components/molecules/RankSelfBanner";
import type { RankEntry, RankViewer } from "@/types/profile";

const entry: RankEntry = {
  userId: "u1",
  name: "Lucas",
  nick: "dead",
  channelUrl: null,
  mainKiller: null,
  mainSurv: null,
  stats: { total: 50, wins: 35, losses: 15, winRate: 70 },
  rank: 42,
};
const ranked: RankViewer = { status: "ranked", entry };

describe("RankSelfBanner", () => {
  it("shows the global position and the matches value for the matches metric", () => {
    render(<RankSelfBanner me={ranked} metric="matches" />);
    expect(screen.getByText(/your position/i)).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("reflects the active metric value for wins and win rate", () => {
    const { rerender } = render(<RankSelfBanner me={ranked} metric="wins" />);
    expect(screen.getByText("35")).toBeInTheDocument();
    rerender(<RankSelfBanner me={ranked} metric="winRate" />);
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("falls back to the nick when the name is absent", () => {
    render(<RankSelfBanner me={{ status: "ranked", entry: { ...entry, name: null } }} metric="matches" />);
    expect(screen.getByText(/\(dead\)/)).toBeInTheDocument();
  });

  it("prompts to create a profile when the viewer has none", () => {
    render(<RankSelfBanner me={{ status: "noProfile" }} metric="matches" />);
    expect(screen.getByText(/not on the rank yet/i)).toBeInTheDocument();
    expect(screen.getByText(/create a public profile/i)).toBeInTheDocument();
    expect(screen.queryByText(/your position/i)).not.toBeInTheDocument();
  });

  it("tells the viewer how many matches remain when below the threshold", () => {
    render(<RankSelfBanner me={{ status: "belowThreshold", total: 15, remaining: 5 }} metric="matches" />);
    expect(screen.getByText(/5 more matches to qualify/i)).toBeInTheDocument();
    expect(screen.getByText(/\(15\/20 played\)/)).toBeInTheDocument();
  });

  it("uses the singular form when a single match remains", () => {
    render(<RankSelfBanner me={{ status: "belowThreshold", total: 19, remaining: 1 }} metric="matches" />);
    expect(screen.getByText(/1 more match to qualify/i)).toBeInTheDocument();
  });

  it("renders nothing while the viewer standing is unknown", () => {
    const { container } = render(<RankSelfBanner me={null} metric="matches" />);
    expect(container).toBeEmptyDOMElement();
  });
});
