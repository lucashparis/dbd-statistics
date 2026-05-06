import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "@/components/atoms/Spinner";

describe("Spinner", () => {
  it("renders with role status", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has accessible loading label", () => {
    render(<Spinner />);
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("applies sm size class", () => {
    render(<Spinner size="sm" />);
    expect(screen.getByRole("status").className).toContain("h-4");
  });

  it("applies lg size class", () => {
    render(<Spinner size="lg" />);
    expect(screen.getByRole("status").className).toContain("h-12");
  });
});
