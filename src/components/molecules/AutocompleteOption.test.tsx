import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutocompleteOption } from "@/components/molecules/AutocompleteOption";
import type { KillerStats } from "@/types/killer";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

const killer: KillerStats = {
  id: 7,
  name: "Huntress",
  imageUrl: "https://example.com/huntress.png",
  wins: 2,
  losses: 5,
  total: 7,
  winRate: 28.5,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("AutocompleteOption", () => {
  it("renders the killer name and portrait", () => {
    render(<AutocompleteOption killer={killer} onClick={() => {}} />);
    expect(screen.getByText("Huntress")).toBeInTheDocument();
    expect(screen.getByAltText("Huntress")).toBeInTheDocument();
  });

  it("calls onClick with the killer when pressed", async () => {
    const onClick = vi.fn();
    render(<AutocompleteOption killer={killer} onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledWith(killer);
  });

  it("reflects the highlighted state", () => {
    render(<AutocompleteOption killer={killer} highlighted onClick={() => {}} />);
    expect(screen.getByRole("button").className).toContain("bg-surface-3");
  });
});
