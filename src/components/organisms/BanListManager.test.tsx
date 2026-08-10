import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BanListManager } from "@/components/organisms/BanListManager";
import { useBannableUserSearch } from "@/hooks/useBannableUserSearch";
import type { BanView } from "@/types/ban";

vi.mock("@/hooks/useBannableUserSearch", () => ({ useBannableUserSearch: vi.fn() }));

const searchMock = vi.mocked(useBannableUserSearch);

const activeBan: BanView = {
  id: "b1",
  userId: "u9",
  name: "Meno",
  nick: "menob7",
  reason: "Fake matches",
  createdAt: "2026-08-09T12:00:00.000Z",
  liftedAt: null,
  bannedBy: "paris",
};

function setup(overrides: Partial<React.ComponentProps<typeof BanListManager>> = {}) {
  const onBan = vi.fn(async () => true);
  const onLift = vi.fn();
  render(
    <BanListManager
      bans={[activeBan]}
      loading={false}
      error={null}
      banning={false}
      liftingId={null}
      onBan={onBan}
      onLift={onLift}
      {...overrides}
    />
  );
  return { onBan, onLift };
}

describe("BanListManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchMock.mockReturnValue({ results: [], loading: false });
  });

  it("lists the active bans with their reason", () => {
    setup();
    expect(screen.getByText("Banned players (1)")).toBeInTheDocument();
    expect(screen.getByText("menob7")).toBeInTheDocument();
    expect(screen.getByText("Fake matches")).toBeInTheDocument();
  });

  it("shows the empty state when nobody is banned", () => {
    setup({ bans: [] });
    expect(screen.getByText("Nobody is on the ban list.")).toBeInTheDocument();
  });

  it("surfaces a load error", () => {
    setup({ bans: [], error: "Could not load the ban list." });
    expect(screen.getByText("Could not load the ban list.")).toBeInTheDocument();
  });

  it("separates lifted bans into the history section", () => {
    setup({ bans: [{ ...activeBan, id: "b2", liftedAt: "2026-08-10T00:00:00.000Z" }] });
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Banned players (0)")).toBeInTheDocument();
  });

  it("keeps the submit button disabled until a player and a reason are set", async () => {
    searchMock.mockReturnValue({
      results: [
        { userId: "u9", nick: "menob7", name: "Meno", imageUrl: null, isBanned: false },
      ],
      loading: false,
    });
    const { onBan } = setup({ bans: [] });
    const submit = screen.getByRole("button", { name: /ban player/i });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Player"), "meno");
    await userEvent.click(screen.getByRole("button", { name: /menob7/i }));
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Reason"), "Fake matches");
    expect(submit).toBeEnabled();

    await userEvent.click(submit);
    expect(onBan).toHaveBeenCalledWith("u9", "Fake matches");
  });

  it("does not offer a player that is already banned", async () => {
    searchMock.mockReturnValue({
      results: [{ userId: "u9", nick: "menob7", name: "Meno", imageUrl: null, isBanned: true }],
      loading: false,
    });
    setup({ bans: [] });
    await userEvent.type(screen.getByLabelText("Player"), "meno");
    expect(screen.getByRole("button", { name: /menob7/i })).toBeDisabled();
    expect(screen.getByText("Already banned")).toBeInTheDocument();
  });

  it("lifts a ban", async () => {
    const { onLift } = setup();
    await userEvent.click(screen.getByRole("button", { name: /lift/i }));
    expect(onLift).toHaveBeenCalledWith("b1");
  });
});
