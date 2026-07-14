import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileCard } from "@/components/molecules/ProfileCard";
import type { PublicProfileSummary } from "@/types/profile";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const base: PublicProfileSummary = {
  userId: "u1",
  name: "Lucas",
  nick: "dead",
  channelUrl: "https://twitch.tv/x",
  mainKiller: { id: 1, name: "Trapper", imageUrl: "https://x/t.png" },
  stats: { total: 10, wins: 6, losses: 4, winRate: 60 },
};

describe("ProfileCard", () => {
  it("links to the internal profile page in the internal variant", () => {
    render(<ProfileCard profile={base} variant="internal" />);
    const link = screen.getByRole("link", { name: /view lucas's statistics/i });
    expect(link).toHaveAttribute("href", "/community/u1");
  });

  it("links out to the channel in the channel variant", () => {
    render(<ProfileCard profile={base} variant="channel" />);
    const link = screen.getByRole("link", { name: /open lucas's channel/i });
    expect(link).toHaveAttribute("href", "https://twitch.tv/x");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("is not a link in the channel variant when there is no channel url", () => {
    render(<ProfileCard profile={{ ...base, channelUrl: null }} variant="channel" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("@dead")).toBeInTheDocument();
  });

  it("shows the mini stats and falls back to nick when name is absent", () => {
    render(<ProfileCard profile={{ ...base, name: null }} variant="internal" />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /view dead's statistics/i });
    expect(link).toBeInTheDocument();
  });
});
