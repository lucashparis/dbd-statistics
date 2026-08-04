import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "@/components/molecules/PasswordInput";

describe("PasswordInput", () => {
  it("masks the value by default", () => {
    render(<PasswordInput name="password" label="Password" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("reveals the value as text when the eye toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<PasswordInput name="password" label="Password" />);

    await user.click(screen.getByRole("button", { name: /show password/i }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();
  });

  it("masks the value again when toggled a second time", async () => {
    const user = userEvent.setup();
    render(<PasswordInput name="password" label="Password" />);

    const toggle = screen.getByRole("button", { name: /show password/i });
    await user.click(toggle);
    await user.click(screen.getByRole("button", { name: /hide password/i }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("forwards name/required/minLength/autoComplete to the input", () => {
    render(
      <PasswordInput
        name="confirmPassword"
        label="Confirm password"
        required
        minLength={4}
        autoComplete="new-password"
      />
    );
    const input = screen.getByLabelText("Confirm password");
    expect(input).toHaveAttribute("name", "confirmPassword");
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("minlength", "4");
    expect(input).toHaveAttribute("autocomplete", "new-password");
  });
});
