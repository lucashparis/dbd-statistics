import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import HomePage from "@/app/page";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const SESSION: Session = { user: { id: "u1" }, expires: "2999-01-01T00:00:00.000Z" };

describe("HomePage (splash)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the splash with an Enter CTA when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);
    render(await HomePage());
    expect(screen.getByRole("link", { name: /enter the fog/i })).toHaveAttribute("href", "/login");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to /dashboard when already authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION);
    await HomePage();
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });
});
