import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const fetchMock = vi.fn();

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("submits the email and shows a confirmation state on success", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ message: "ok" }) });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/email/i), "a@b.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/forgot-password",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "a@b.com" }) })
    );
    await waitFor(() => expect(screen.getByText(/check your inbox/i)).toBeInTheDocument());
    expect(toast.success).toHaveBeenCalled();
  });

  it("shows an error toast and keeps the form when the request fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "bad" }) });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/email/i), "a@b.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByText(/check your inbox/i)).not.toBeInTheDocument();
  });
});
