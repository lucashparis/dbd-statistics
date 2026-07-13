import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardSkeleton } from "@/components/templates/DashboardSkeleton";

describe("DashboardSkeleton", () => {
  it("exposes a loading status to assistive tech", () => {
    render(<DashboardSkeleton />);
    expect(
      screen.getByRole("status", { name: /loading dashboard/i })
    ).toBeInTheDocument();
  });

  it("renders at least the killer grid worth of placeholders", () => {
    const { container } = render(<DashboardSkeleton />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(12);
  });
});
