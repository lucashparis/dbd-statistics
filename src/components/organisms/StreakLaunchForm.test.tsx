import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StreakLaunchForm } from "@/components/organisms/StreakLaunchForm";

const teams = [{ id: 1, name: "Alpha", createdAt: "2024-01-01T00:00:00.000Z", members: [] }];
const killers = [
  { id: 9, name: "Nurse" },
  { id: 8, name: "Trapper" },
];

describe("StreakLaunchForm", () => {
  it("prompts to create a team when there are none", () => {
    render(<StreakLaunchForm teams={[]} killers={killers} launching={false} onLaunch={vi.fn()} />);
    expect(screen.getByText(/create a team first/i)).toBeInTheDocument();
  });

  it("launches a win with the selected team and killer", async () => {
    const onLaunch = vi.fn().mockResolvedValue(true);
    render(<StreakLaunchForm teams={teams} killers={killers} launching={false} onLaunch={onLaunch} />);
    await userEvent.selectOptions(screen.getByLabelText("Team"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Killer faced"), "9");
    await userEvent.click(screen.getByRole("button", { name: /log match/i }));
    expect(onLaunch).toHaveBeenCalledWith(1, 9, "win");
  });

  it("launches a loss when the loss toggle is selected", async () => {
    const onLaunch = vi.fn().mockResolvedValue(true);
    render(<StreakLaunchForm teams={teams} killers={killers} launching={false} onLaunch={onLaunch} />);
    await userEvent.selectOptions(screen.getByLabelText("Team"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Killer faced"), "8");
    await userEvent.click(screen.getByRole("button", { name: /loss/i }));
    await userEvent.click(screen.getByRole("button", { name: /log match/i }));
    expect(onLaunch).toHaveBeenCalledWith(1, 8, "loss");
  });
});
