import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeToggle } from "@/components/molecules/ModeToggle";
import { ModeProvider } from "@/contexts/ModeContext";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const fetchMock = vi.fn();

function renderToggle(initialMode: "survivor" | "killer" = "survivor") {
  return render(
    <ModeProvider initialMode={initialMode}>
      <ModeToggle />
    </ModeProvider>
  );
}

describe("ModeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("marks the initial mode as pressed", () => {
    renderToggle("survivor");
    expect(screen.getByRole("button", { name: /surv/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /killer/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches mode and persists the choice to the server", async () => {
    const user = userEvent.setup();
    renderToggle("survivor");
    await user.click(screen.getByRole("button", { name: /killer/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /killer/i })).toHaveAttribute("aria-pressed", "true")
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me/preferences",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ mode: "killer" }) })
    );
  });

  it("rolls back the mode when the server rejects", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    const user = userEvent.setup();
    renderToggle("survivor");
    await user.click(screen.getByRole("button", { name: /killer/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /surv/i })).toHaveAttribute("aria-pressed", "true")
    );
  });
});
