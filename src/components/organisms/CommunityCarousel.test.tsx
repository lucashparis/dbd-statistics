import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommunityCarousel } from "@/components/organisms/CommunityCarousel";
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

function summary(userId: string): PublicProfileSummary {
  return {
    userId,
    name: userId,
    nick: userId,
    channelUrl: "https://twitch.tv/" + userId,
    mainKiller: null,
    mainSurv: null,
    stats: { total: 1, wins: 1, losses: 0, winRate: 100 },
  };
}

describe("CommunityCarousel", () => {
  beforeEach(() => {
    // reduced-motion: skip the auto-advance timer entirely
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    );
  });

  it("renders nothing when there are no profiles", () => {
    const { container } = render(<CommunityCarousel profiles={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a card per profile with navigation controls", () => {
    render(<CommunityCarousel profiles={[summary("a"), summary("b")]} />);
    expect(screen.getByRole("link", { name: /open a's channel/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open b's channel/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Previous members")).toBeInTheDocument();
    expect(screen.getByLabelText("Next members")).toBeInTheDocument();
  });
});
