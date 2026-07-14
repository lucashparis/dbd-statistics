import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StreakLaunchForm } from "@/components/organisms/StreakLaunchForm";
import type { KillerStats } from "@/types/killer";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const teams = [{ id: 1, name: "Alpha", createdAt: "2024-01-01T00:00:00.000Z", members: [] }];

const killer = (id: number, name: string): KillerStats => ({
  id,
  name,
  imageUrl: `https://example.com/${name}.png`,
  wins: 0,
  losses: 0,
  total: 0,
  winRate: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
});

const killers = [killer(9, "Nurse"), killer(8, "Trapper")];

async function pickKiller(name: string) {
  await userEvent.type(screen.getByLabelText("Killer faced"), name);
  await userEvent.click(screen.getByRole("option", { name: new RegExp(name, "i") }));
}

describe("StreakLaunchForm", () => {
  it("prompts to create a team when there are none", () => {
    render(<StreakLaunchForm teams={[]} killers={killers} launching={false} onLaunch={vi.fn()} />);
    expect(screen.getByText(/create a team first/i)).toBeInTheDocument();
  });

  it("launches a win with the selected team and killer", async () => {
    const onLaunch = vi.fn().mockResolvedValue(true);
    render(<StreakLaunchForm teams={teams} killers={killers} launching={false} onLaunch={onLaunch} />);
    await userEvent.selectOptions(screen.getByLabelText("Team"), "1");
    await pickKiller("Nurse");
    await userEvent.click(screen.getByRole("button", { name: /log match/i }));
    expect(onLaunch).toHaveBeenCalledWith(1, 9, "win");
  });

  it("launches a loss when the loss toggle is selected", async () => {
    const onLaunch = vi.fn().mockResolvedValue(true);
    render(<StreakLaunchForm teams={teams} killers={killers} launching={false} onLaunch={onLaunch} />);
    await userEvent.selectOptions(screen.getByLabelText("Team"), "1");
    await pickKiller("Trapper");
    await userEvent.click(screen.getByRole("button", { name: /loss/i }));
    await userEvent.click(screen.getByRole("button", { name: /log match/i }));
    expect(onLaunch).toHaveBeenCalledWith(1, 8, "loss");
  });

  it("keeps the submit button disabled until a killer is picked via autocomplete", async () => {
    render(<StreakLaunchForm teams={teams} killers={killers} launching={false} onLaunch={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText("Team"), "1");
    expect(screen.getByRole("button", { name: /log match/i })).toBeDisabled();
    await pickKiller("Nurse");
    expect(screen.getByRole("button", { name: /log match/i })).toBeEnabled();
  });

  it("clears the killer selection after a successful launch", async () => {
    const onLaunch = vi.fn().mockResolvedValue(true);
    render(<StreakLaunchForm teams={teams} killers={killers} launching={false} onLaunch={onLaunch} />);
    await userEvent.selectOptions(screen.getByLabelText("Team"), "1");
    await pickKiller("Nurse");
    await userEvent.click(screen.getByRole("button", { name: /log match/i }));
    expect(screen.getByRole("combobox", { name: "Killer faced" })).toHaveValue("");
  });
});
