import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ProgressBar } from "@/components/atoms/ProgressBar";

describe("ProgressBar", () => {
  it("renders the fill bar with correct percentage width", () => {
    const { container } = render(<ProgressBar value={75} />);
    const fill = container.querySelector<HTMLElement>("[style]");
    expect(fill).toHaveStyle("width: 75%");
  });

  it("clamps value above 100 to 100%", () => {
    const { container } = render(<ProgressBar value={150} />);
    const fill = container.querySelector<HTMLElement>("[style]");
    expect(fill).toHaveStyle("width: 100%");
  });

  it("clamps negative value to 0%", () => {
    const { container } = render(<ProgressBar value={-10} />);
    const fill = container.querySelector<HTMLElement>("[style]");
    expect(fill).toHaveStyle("width: 0%");
  });

  it("applies emerald color when value >= 60", () => {
    const { container } = render(<ProgressBar value={60} />);
    const fill = container.querySelector<HTMLElement>("[style]");
    expect(fill?.className).toContain("bg-emerald-500");
  });

  it("applies amber color when value is between 40 and 59", () => {
    const { container } = render(<ProgressBar value={50} />);
    const fill = container.querySelector<HTMLElement>("[style]");
    expect(fill?.className).toContain("bg-amber-500");
  });

  it("applies blood color when value is below 40", () => {
    const { container } = render(<ProgressBar value={30} />);
    const fill = container.querySelector<HTMLElement>("[style]");
    expect(fill?.className).toContain("bg-blood");
  });

  it("shows label text when showLabel is true", () => {
    const { getByText } = render(<ProgressBar value={42} showLabel />);
    expect(getByText("42%")).toBeInTheDocument();
  });
});
