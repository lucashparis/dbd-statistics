import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/atoms/Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Test</Badge>);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("applies success variant class", () => {
    render(<Badge variant="success">Win</Badge>);
    expect(screen.getByText("Win").className).toContain("text-emerald-400");
  });

  it("applies danger variant class", () => {
    render(<Badge variant="danger">Loss</Badge>);
    expect(screen.getByText("Loss").className).toContain("text-blood");
  });

  it("applies muted variant class", () => {
    render(<Badge variant="muted">N/A</Badge>);
    expect(screen.getByText("N/A").className).toContain("text-muted");
  });
});
