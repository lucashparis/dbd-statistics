import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CommunityProfilePage from "@/app/community/[userId]/page";
import { getPublicProfile } from "@/lib/community";
import { notFound } from "next/navigation";
import type { PublicProfileDetail } from "@/types/profile";

vi.mock("@/lib/community", () => ({ getPublicProfile: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/components/organisms/AppHeader", () => ({
  AppHeader: () => <div data-testid="app-header" />,
}));
vi.mock("@/components/organisms/PublicProfileView", () => ({
  PublicProfileView: ({ survivor }: { survivor: PublicProfileDetail }) => (
    <div data-testid="profile-view">{survivor.nick}</div>
  ),
}));

const detail: PublicProfileDetail = {
  userId: "u1",
  name: "Lucas",
  nick: "dead",
  channelUrl: null,
  mainKiller: null,
  mainSurv: null,
  stats: { total: 0, wins: 0, losses: 0, winRate: 0 },
  killers: [],
  streaks: { global: { longestWin: 0, longestLoss: 0 }, perKiller: {} },
};

describe("CommunityProfilePage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls notFound when the survivor profile does not exist", async () => {
    vi.mocked(getPublicProfile).mockResolvedValue(null);
    await expect(
      CommunityProfilePage({ params: Promise.resolve({ userId: "ghost" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("renders the public profile view for an existing profile", async () => {
    // survivor + killer perspectives are fetched in parallel.
    vi.mocked(getPublicProfile)
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce({ ...detail, streaks: null });
    render(await CommunityProfilePage({ params: Promise.resolve({ userId: "u1" }) }));
    expect(screen.getByTestId("profile-view")).toHaveTextContent("dead");
    expect(getPublicProfile).toHaveBeenCalledWith("u1", "survivor");
    expect(getPublicProfile).toHaveBeenCalledWith("u1", "killer");
  });
});
