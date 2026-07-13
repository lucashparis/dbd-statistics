import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GlobalError from "@/app/global-error";

describe("global error", () => {
  it("renders a fatal error message", () => {
    render(<GlobalError error={new Error("fatal")} reset={() => {}} />);
    expect(
      screen.getByRole("heading", { name: /something went wrong/i })
    ).toBeInTheDocument();
  });

  it("calls reset when the retry button is clicked", async () => {
    const reset = vi.fn();
    render(<GlobalError error={new Error("fatal")} reset={reset} />);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
