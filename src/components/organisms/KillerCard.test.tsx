import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KillerCard } from "@/components/organisms/KillerCard";
import type { KillerStats } from "@/types/killer";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

const killer: KillerStats = {
  id: 1,
  name: "Trapper",
  imageUrl: "https://example.com/trapper.png",
  wins: 6,
  losses: 4,
  total: 10,
  winRate: 60,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const handlers = {
  onWin: vi.fn(),
  onLoss: vi.fn(),
  onUndoWin: vi.fn(),
  onUndoLoss: vi.fn(),
};

describe("KillerCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the killer name", () => {
    render(<KillerCard killer={killer} {...handlers} />);
    expect(screen.getByText("Trapper")).toBeInTheDocument();
  });

  it("renders killer image with correct alt text", () => {
    render(<KillerCard killer={killer} {...handlers} />);
    expect(screen.getByRole("img", { name: "Trapper" })).toBeInTheDocument();
  });

  it("calls onWin with killer id when Win button is clicked", () => {
    render(<KillerCard killer={killer} {...handlers} />);
    fireEvent.click(screen.getByLabelText("Register win"));
    expect(handlers.onWin).toHaveBeenCalledWith(1);
  });

  it("calls onLoss with killer id when Loss button is clicked", () => {
    render(<KillerCard killer={killer} {...handlers} />);
    fireEvent.click(screen.getByLabelText("Register loss"));
    expect(handlers.onLoss).toHaveBeenCalledWith(1);
  });

  it("calls onKillerClick with killer when the image area is clicked", () => {
    const onKillerClick = vi.fn();
    render(
      <KillerCard killer={killer} {...handlers} onKillerClick={onKillerClick} />
    );
    fireEvent.click(screen.getByLabelText("View Trapper statistics"));
    expect(onKillerClick).toHaveBeenCalledWith(killer);
  });

  it("does not render a clickable area when onKillerClick is not provided", () => {
    render(<KillerCard killer={killer} {...handlers} />);
    expect(
      screen.queryByLabelText("View Trapper statistics")
    ).not.toBeInTheDocument();
  });
});
