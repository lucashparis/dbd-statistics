import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { ResetPasswordForm } from "./ResetPasswordForm";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const { pushMock, refreshMock } = vi.hoisted(() => ({ pushMock: vi.fn(), refreshMock: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));

vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));

const fetchMock = vi.fn();

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows the invalid-link state directly when there is no token", () => {
    render(<ResetPasswordForm token={null} />);
    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
  });

  it("shows an error and skips the request when passwords do not match", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm token="raw-token" />);

    await user.type(screen.getByLabelText(/new password/i), "secret1");
    await user.type(screen.getByLabelText(/confirm password/i), "secret2");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(toast.error).toHaveBeenCalledWith("Passwords do not match");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits token + password, signs in with the returned email, and redirects to /dashboard", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ ok: true, email: "a@b.com" }),
    });
    vi.mocked(signIn).mockResolvedValueOnce({ ok: true, error: undefined } as never);
    const user = userEvent.setup();
    render(<ResetPasswordForm token="raw-token" />);

    await user.type(screen.getByLabelText(/new password/i), "secret1");
    await user.type(screen.getByLabelText(/confirm password/i), "secret1");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/reset-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: "raw-token", password: "secret1" }),
      })
    );
    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "a@b.com",
        password: "secret1",
        redirect: false,
      })
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("falls back to /login when the auto sign-in fails", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ ok: true, email: "a@b.com" }),
    });
    vi.mocked(signIn).mockResolvedValueOnce({ ok: false, error: "CredentialsSignin" } as never);
    const user = userEvent.setup();
    render(<ResetPasswordForm token="raw-token" />);

    await user.type(screen.getByLabelText(/new password/i), "secret1");
    await user.type(screen.getByLabelText(/confirm password/i), "secret1");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("switches to the invalid-link state on a 400 response", async () => {
    fetchMock.mockResolvedValueOnce({ status: 400, ok: false, json: async () => ({ error: "Invalid or expired token" }) });
    const user = userEvent.setup();
    render(<ResetPasswordForm token="raw-token" />);

    await user.type(screen.getByLabelText(/new password/i), "secret1");
    await user.type(screen.getByLabelText(/confirm password/i), "secret1");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument());
  });
});
