import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatItem } from "@/components/molecules/StatItem";
import { Trophy } from "lucide-react";

describe("StatItem", () => {
  it("renders numeric value and label", () => {
    render(<StatItem icon={Trophy} value={42} label="Wins" />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Wins")).toBeInTheDocument();
  });

  it("renders string value", () => {
    render(<StatItem icon={Trophy} value="75%" label="Win Rate" />);
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
  });
});
