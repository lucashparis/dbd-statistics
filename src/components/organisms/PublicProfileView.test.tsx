import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicProfileView } from "@/components/organisms/PublicProfileView";
import type { PublicProfileDetail } from "@/types/profile";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("@/components/organisms/StatisticsOverview", () => ({
  StatisticsOverview: () => <div data-testid="stats-overview" />,
}));

const detail: PublicProfileDetail = {
  userId: "u1",
  name: "Lucas",
  nick: "dead",
  channelUrl: "https://twitch.tv/x",
  mainKiller: { id: 1, name: "Trapper", imageUrl: "https://x/t.png" },
  stats: { total: 10, wins: 6, losses: 4, winRate: 60 },
  killers: [],
  streaks: { global: { longestWin: 0, longestLoss: 0 }, perKiller: {} },
};

describe("PublicProfileView", () => {
  it("renders the header, main killer, channel link and the stats overview", () => {
    render(<PublicProfileView profile={detail} />);
    expect(screen.getByRole("heading", { name: "Lucas" })).toBeInTheDocument();
    expect(screen.getByText("@dead")).toBeInTheDocument();
    expect(screen.getByText(/main · trapper/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /visit channel/i })).toHaveAttribute(
      "href",
      "https://twitch.tv/x"
    );
    expect(screen.getByTestId("stats-overview")).toBeInTheDocument();
  });

  it("falls back to the nick as the heading when there is no name", () => {
    render(<PublicProfileView profile={{ ...detail, name: null }} />);
    expect(screen.getByRole("heading", { name: "dead" })).toBeInTheDocument();
  });
});
