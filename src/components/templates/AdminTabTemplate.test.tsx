import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminTabTemplate } from "@/components/templates/AdminTabTemplate";
import { useAdminBans } from "@/hooks/useAdminBans";

vi.mock("@/hooks/useAdminBans", () => ({ useAdminBans: vi.fn() }));
vi.mock("@/components/organisms/BanListManager", () => ({
  BanListManager: (props: { bans: unknown[]; loading: boolean }) => (
    <div data-testid="manager">{props.loading ? "loading" : `bans:${props.bans.length}`}</div>
  ),
}));

const hookMock = vi.mocked(useAdminBans);

function stub(overrides: Partial<ReturnType<typeof useAdminBans>> = {}) {
  hookMock.mockReturnValue({
    bans: [],
    loading: false,
    error: null,
    banning: false,
    liftingId: null,
    ban: vi.fn(),
    liftBan: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useAdminBans>);
}

describe("AdminTabTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stub();
  });

  it("explains the rule that a banned player still gets crew matches", () => {
    render(<AdminTabTemplate isActive />);
    expect(screen.getByRole("heading", { name: "Ban list" })).toBeInTheDocument();
    expect(screen.getByText(/cannot log matches or host a crew/i)).toBeInTheDocument();
  });

  it("passes the active flag through so the list only loads on the open tab", () => {
    render(<AdminTabTemplate isActive={false} />);
    expect(hookMock).toHaveBeenCalledWith(false);
  });

  it("forwards the hook state to the manager", () => {
    stub({ loading: true });
    render(<AdminTabTemplate isActive />);
    expect(screen.getByTestId("manager")).toHaveTextContent("loading");
  });
});
