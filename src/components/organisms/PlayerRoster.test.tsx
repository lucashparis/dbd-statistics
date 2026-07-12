import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayerRoster } from "@/components/organisms/PlayerRoster";

const players = [{ id: 1, name: "Lucas", nick: "OldDead", createdAt: "2024-01-01T00:00:00.000Z" }];

describe("PlayerRoster", () => {
  it("renders the player list", () => {
    render(
      <PlayerRoster
        players={players}
        loading={false}
        saving={false}
        deletingId={null}
        onAdd={vi.fn().mockResolvedValue(true)}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("Lucas")).toBeInTheDocument();
    expect(screen.getByText("OldDead")).toBeInTheDocument();
  });

  it("shows an empty state when there are no players", () => {
    render(
      <PlayerRoster
        players={[]}
        loading={false}
        saving={false}
        deletingId={null}
        onAdd={vi.fn().mockResolvedValue(true)}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText(/no players yet/i)).toBeInTheDocument();
  });

  it("submits name and nick through onAdd", async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    render(
      <PlayerRoster
        players={[]}
        loading={false}
        saving={false}
        deletingId={null}
        onAdd={onAdd}
        onDelete={vi.fn()}
      />
    );
    await userEvent.type(screen.getByLabelText("Player name"), "Fran");
    await userEvent.type(screen.getByLabelText("Player nick"), "Francyx");
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(onAdd).toHaveBeenCalledWith("Fran", "Francyx");
  });

  it("calls onDelete for a player", async () => {
    const onDelete = vi.fn();
    render(
      <PlayerRoster
        players={players}
        loading={false}
        saving={false}
        deletingId={null}
        onAdd={vi.fn().mockResolvedValue(true)}
        onDelete={onDelete}
      />
    );
    await userEvent.click(screen.getByLabelText("Delete OldDead"));
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
