import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RankMetricToggle } from "@/components/molecules/RankMetricToggle";

describe("RankMetricToggle", () => {
  it("renders the three metric options inside a labelled group", () => {
    render(<RankMetricToggle value="matches" onChange={() => {}} />);
    expect(screen.getByRole("group", { name: /sort rank by/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Matches" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wins" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Win rate" })).toBeInTheDocument();
  });

  it("marks the active metric with aria-pressed", () => {
    render(<RankMetricToggle value="wins" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Wins" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Matches" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with the selected metric key", async () => {
    const onChange = vi.fn();
    render(<RankMetricToggle value="matches" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Win rate" }));
    expect(onChange).toHaveBeenCalledWith("winRate");
  });
});
