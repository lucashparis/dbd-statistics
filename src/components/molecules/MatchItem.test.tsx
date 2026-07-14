import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchItem } from "@/components/molecules/MatchItem";
import type { Match } from "@/types/killer";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

const match: Match = {
  id: 1,
  killerId: 7,
  result: "win",
  createdAt: "2024-01-01T12:00:00.000Z",
  killer: {
    id: 7,
    name: "Huntress",
    imageUrl: "https://example.com/huntress.png",
  },
};

describe("MatchItem", () => {
  it("renders the killer name and a Victory badge for a win", () => {
    render(<MatchItem match={match} index={0} />);
    expect(screen.getByText("Huntress")).toBeInTheDocument();
    expect(screen.getByText("Victory")).toBeInTheDocument();
  });

  it("renders a Defeat badge for a loss", () => {
    render(<MatchItem match={{ ...match, result: "loss" }} index={0} />);
    expect(screen.getByText("Defeat")).toBeInTheDocument();
  });

  it("staggers the entrance animation by index", () => {
    render(<MatchItem match={match} index={3} />);
    expect(screen.getByRole("listitem")).toHaveStyle({ animationDelay: "120ms" });
  });

  it("caps the animation delay so late-paginated items never wait too long", () => {
    render(<MatchItem match={match} index={50} />);
    expect(screen.getByRole("listitem")).toHaveStyle({ animationDelay: "320ms" });
  });
});
