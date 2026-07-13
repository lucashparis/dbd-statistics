import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "@/app/error";

describe("error boundary", () => {
  it("shows an error message and the digest reference", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<ErrorBoundary error={error} reset={() => {}} />);
    expect(
      screen.getByRole("heading", { name: /something went wrong/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
  });

  it("calls reset when the retry button is clicked", async () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error("boom")} reset={reset} />);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
