import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InviteBell } from "@/components/organisms/InviteBell";
import { useInvites } from "@/hooks/useInvites";

vi.mock("@/hooks/useInvites", () => ({ useInvites: vi.fn() }));

const base = {
  invites: [],
  count: 0,
  loading: false,
  respondingId: null,
  accept: vi.fn(),
  decline: vi.fn(),
};

describe("InviteBell", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the pending count in the trigger label", () => {
    vi.mocked(useInvites).mockReturnValue({
      ...base,
      count: 2,
      invites: [
        { id: 1, crew: { id: 1, name: "Alpha" }, invitedBy: { name: "Léo", nick: "leo" }, invitedAt: "" },
        { id: 2, crew: { id: 2, name: "Beta" }, invitedBy: { name: null, nick: "ro" }, invitedAt: "" },
      ],
    });
    render(<InviteBell />);
    expect(screen.getByRole("button", { name: /2 pending crew invites/i })).toBeInTheDocument();
  });

  it("accepts an invite from the dropdown", async () => {
    const accept = vi.fn();
    vi.mocked(useInvites).mockReturnValue({
      ...base,
      count: 1,
      accept,
      invites: [
        { id: 7, crew: { id: 1, name: "Alpha" }, invitedBy: { name: "Léo", nick: "leo" }, invitedAt: "" },
      ],
    });
    render(<InviteBell />);
    await userEvent.click(screen.getByRole("button", { name: /1 pending crew invites/i }));
    await userEvent.click(await screen.findByRole("button", { name: /^Accept$/i }));
    expect(accept).toHaveBeenCalledWith(7);
  });
});
