import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Loading from "@/app/dashboard/loading";

describe("dashboard loading", () => {
  it("renders the dashboard skeleton fallback", () => {
    render(<Loading />);
    expect(
      screen.getByRole("status", { name: /loading dashboard/i })
    ).toBeInTheDocument();
  });
});
