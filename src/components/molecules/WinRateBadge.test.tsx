import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WinRateBadge } from "@/components/molecules/WinRateBadge";

describe("WinRateBadge", () => {
  it("renders the win rate percentage", () => {
    render(<WinRateBadge winRate={75} />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("applies emerald color class when winRate >= 60", () => {
    render(<WinRateBadge winRate={60} />);
    expect(screen.getByText("60%").className).toContain("text-emerald-400");
  });

  it("applies amber color class when winRate is between 40 and 59", () => {
    render(<WinRateBadge winRate={50} />);
    expect(screen.getByText("50%").className).toContain("text-amber-400");
  });

  it("applies blood color class when winRate is below 40", () => {
    render(<WinRateBadge winRate={20} />);
    expect(screen.getByText("20%").className).toContain("text-blood");
  });

  it("renders the Win Rate label", () => {
    render(<WinRateBadge winRate={0} />);
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
  });
});
