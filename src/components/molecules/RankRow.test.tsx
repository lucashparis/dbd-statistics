import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RankRow } from "@/components/molecules/RankRow";
import type { RankEntry } from "@/types/profile";

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

const base: RankEntry = {
  userId: "u1",
  name: "Lucas",
  nick: "dead",
  channelUrl: null,
  mainKiller: { id: 1, name: "Trapper", imageUrl: "https://x/t.png" },
  mainSurv: null,
  stats: { total: 42, wins: 30, losses: 12, winRate: 71 },
  rank: 5,
};

describe("RankRow", () => {
  it("renders the position, identity and all three stats", () => {
    render(<RankRow entry={base} metric="matches" />);
    expect(screen.getByText("#5")).toBeInTheDocument();
    expect(screen.getByText("Lucas")).toBeInTheDocument();
    expect(screen.getByText("@dead")).toBeInTheDocument();
    expect(screen.getByText("Trapper")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("71%")).toBeInTheDocument();
  });

  it("links to the internal community profile page", () => {
    render(<RankRow entry={base} metric="matches" />);
    expect(screen.getByRole("link", { name: /view lucas's statistics/i })).toHaveAttribute(
      "href",
      "/community/u1"
    );
  });

  it("falls back to the nick when the name is absent", () => {
    render(<RankRow entry={{ ...base, name: null }} metric="matches" />);
    expect(screen.getByRole("link", { name: /view dead's statistics/i })).toBeInTheDocument();
  });

  it("emphasizes the active metric only", () => {
    const { rerender } = render(<RankRow entry={base} metric="winRate" />);
    expect(screen.getByText("71%").className).toContain("text-blood");
    rerender(<RankRow entry={base} metric="matches" />);
    expect(screen.getByText("71%").className).not.toContain("text-blood");
  });

  it("shows the You badge only when the row is the viewer's", () => {
    const { rerender } = render(<RankRow entry={base} metric="matches" />);
    expect(screen.queryByText("You")).not.toBeInTheDocument();
    rerender(<RankRow entry={base} metric="matches" isMe />);
    expect(screen.getByText("You")).toBeInTheDocument();
  });
});
