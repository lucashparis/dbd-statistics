import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CrewManager } from "@/components/organisms/CrewManager";
import { useInviteeSearch } from "@/hooks/useInviteeSearch";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("@/hooks/useInviteeSearch", () => ({ useInviteeSearch: vi.fn() }));

describe("CrewManager", () => {
  beforeEach(() => {
    vi.mocked(useInviteeSearch).mockReturnValue({ results: [], loading: false });
  });

  it("creates a crew with the chosen policy", async () => {
    const onCreate = vi.fn().mockResolvedValue(true);
    render(<CrewManager creating={false} onCreate={onCreate} />);
    await userEvent.type(screen.getByLabelText(/Crew name/i), "The Fog Runners");
    await userEvent.click(screen.getByRole("radio", { name: /Only the host/i }));
    await userEvent.click(screen.getByRole("button", { name: /Create crew/i }));
    expect(onCreate).toHaveBeenCalledWith({
      name: "The Fog Runners",
      inviteeUserIds: [],
      writePolicy: "hostOnly",
    });
  });

  it("adds a searched invitee and includes them on create", async () => {
    vi.mocked(useInviteeSearch).mockReturnValue({
      results: [{ userId: "u2", nick: "ro", name: "Ro", imageUrl: null }],
      loading: false,
    });
    const onCreate = vi.fn().mockResolvedValue(true);
    render(<CrewManager creating={false} onCreate={onCreate} />);
    await userEvent.type(screen.getByLabelText(/Crew name/i), "Alpha");
    await userEvent.type(screen.getByLabelText(/Invite players/i), "ro");
    await userEvent.click(screen.getByRole("button", { name: /ro/i }));
    await userEvent.click(screen.getByRole("button", { name: /Create crew/i }));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Alpha", inviteeUserIds: ["u2"] })
    );
  });

  it("keeps create disabled without a name", () => {
    render(<CrewManager creating={false} onCreate={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Create crew/i })).toBeDisabled();
  });
});
