import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommunityTabTemplate } from "@/components/templates/CommunityTabTemplate";
import { useCommunity } from "@/hooks/useCommunity";
import type { PublicProfileSummary } from "@/types/profile";

vi.mock("@/hooks/useCommunity", () => ({ useCommunity: vi.fn() }));
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
    channelUrl: null,
    mainKiller: null,
    stats: { total: 0, wins: 0, losses: 0, winRate: 0 },
  };
}

const base = {
  profiles: [] as PublicProfileSummary[],
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null as string | null,
  loadMore: vi.fn(),
  retry: vi.fn(),
};

function mockHook(overrides: Partial<typeof base>) {
  vi.mocked(useCommunity).mockReturnValue({ ...base, ...overrides });
}

describe("CommunityTabTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows an empty state when there are no public profiles", () => {
    mockHook({ profiles: [] });
    render(<CommunityTabTemplate isActive />);
    expect(screen.getByText(/no public profiles yet/i)).toBeInTheDocument();
  });

  it("renders a card per profile and a load-more control when there are more", () => {
    mockHook({ profiles: [summary("a"), summary("b")], hasMore: true });
    render(<CommunityTabTemplate isActive />);
    expect(screen.getByRole("link", { name: /view a's statistics/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(base.loadMore).toHaveBeenCalled();
  });

  it("shows an error state with a retry action", () => {
    mockHook({ error: "Could not load the community." });
    render(<CommunityTabTemplate isActive />);
    expect(screen.getByText("Could not load the community")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(base.retry).toHaveBeenCalled();
  });
});
