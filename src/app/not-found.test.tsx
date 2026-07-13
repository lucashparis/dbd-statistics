import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "@/app/not-found";

describe("not found", () => {
  it("renders a 404 message and a link back to the dashboard", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { name: /lost in the fog/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to dashboard/i })
    ).toHaveAttribute("href", "/dashboard");
  });
});
