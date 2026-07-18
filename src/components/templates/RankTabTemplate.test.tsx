import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RankTabTemplate } from "@/components/templates/RankTabTemplate";
import { useRank } from "@/hooks/useRank";
import type { RankEntry, RankViewer } from "@/types/profile";

vi.mock("@/hooks/useRank", () => ({ useRank: vi.fn() }));
vi.mock("@/hooks/useDebouncedValue", () => ({ useDebouncedValue: (value: unknown) => value }));
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

function entry(userId: string, rank: number): RankEntry {
  return {
    userId,
    name: userId,
    nick: userId,
    channelUrl: null,
    mainKiller: null,
    mainSurv: null,
    stats: { total: 40, wins: 20, losses: 20, winRate: 50 },
    rank,
  };
}

const base = {
  entries: [] as RankEntry[],
  me: null as RankViewer | null,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null as string | null,
  loadMore: vi.fn(),
  retry: vi.fn(),
};

function mockHook(overrides: Partial<typeof base>) {
  vi.mocked(useRank).mockReturnValue({ ...base, ...overrides });
}

describe("RankTabTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHook({});
  });

  it("always shows the 20-matches eligibility rule", () => {
    render(<RankTabTemplate isActive />);
    expect(screen.getByText(/at least 20 matches/i)).toBeInTheDocument();
  });

  it("shows the position banner and marks the viewer's own row when ranked", () => {
    const mine = entry("u1", 3);
    mockHook({ entries: [entry("u9", 1), mine], me: { status: "ranked", entry: mine } });
    render(<RankTabTemplate isActive />);
    expect(screen.getByText(/your position/i)).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("shows the create-profile hint when the viewer has no profile", () => {
    mockHook({ entries: [entry("u9", 1)], me: { status: "noProfile" } });
    render(<RankTabTemplate isActive />);
    expect(screen.getByText(/create a public profile/i)).toBeInTheDocument();
  });

  it("shows the remaining-matches hint when the viewer is below the threshold", () => {
    mockHook({ entries: [entry("u9", 1)], me: { status: "belowThreshold", total: 18, remaining: 2 } });
    render(<RankTabTemplate isActive />);
    expect(screen.getByText(/2 more matches to qualify/i)).toBeInTheDocument();
  });

  it("renders skeletons while loading", () => {
    mockHook({ loading: true });
    const { container } = render(<RankTabTemplate isActive />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows the no-eligible empty state when nobody qualifies", () => {
    mockHook({ entries: [], me: null });
    render(<RankTabTemplate isActive />);
    expect(screen.getByText(/no players have 20\+ matches yet/i)).toBeInTheDocument();
  });

  it("shows a search-specific empty state when a search returns nothing", async () => {
    mockHook({ entries: [], me: null });
    render(<RankTabTemplate isActive />);
    await userEvent.type(screen.getByRole("textbox", { name: /search rank/i }), "zzz");
    expect(screen.getByText(/no players match your search/i)).toBeInTheDocument();
  });

  it("shows an error state with a retry action", () => {
    mockHook({ error: "Could not load the rank." });
    render(<RankTabTemplate isActive />);
    expect(screen.getByText("Could not load the rank")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(base.retry).toHaveBeenCalled();
  });

  it("renders a row per entry and a working load-more control", () => {
    mockHook({ entries: [entry("a", 1), entry("b", 2)], hasMore: true });
    render(<RankTabTemplate isActive />);
    expect(screen.getByRole("link", { name: /view a's statistics/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(base.loadMore).toHaveBeenCalled();
  });

  it("switches the metric passed to useRank when the toggle changes", async () => {
    mockHook({ entries: [entry("a", 1)] });
    render(<RankTabTemplate isActive />);
    await userEvent.click(screen.getByRole("button", { name: "Wins" }));
    const calls = vi.mocked(useRank).mock.calls;
    expect(calls[calls.length - 1][1]).toBe("wins");
  });

  it("passes the typed search down to useRank", async () => {
    mockHook({ entries: [entry("a", 1)] });
    render(<RankTabTemplate isActive />);
    await userEvent.type(screen.getByRole("textbox", { name: /search rank/i }), "neo");
    const calls = vi.mocked(useRank).mock.calls;
    expect(calls[calls.length - 1][2]).toBe("neo");
  });
});
