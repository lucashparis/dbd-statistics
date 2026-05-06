import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionButtons } from "@/components/molecules/ActionButtons";

const handlers = {
  onWin: vi.fn(),
  onLoss: vi.fn(),
  onUndoWin: vi.fn(),
  onUndoLoss: vi.fn(),
};

describe("ActionButtons", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders all four action buttons", () => {
    render(<ActionButtons killerId={1} {...handlers} />);
    expect(screen.getByLabelText("Register win")).toBeInTheDocument();
    expect(screen.getByLabelText("Register loss")).toBeInTheDocument();
    expect(screen.getByLabelText("Undo win")).toBeInTheDocument();
    expect(screen.getByLabelText("Undo loss")).toBeInTheDocument();
  });

  it("calls onWin with killerId when Win button is clicked", () => {
    render(<ActionButtons killerId={5} {...handlers} />);
    fireEvent.click(screen.getByLabelText("Register win"));
    expect(handlers.onWin).toHaveBeenCalledWith(5);
  });

  it("calls onLoss with killerId when Loss button is clicked", () => {
    render(<ActionButtons killerId={5} {...handlers} />);
    fireEvent.click(screen.getByLabelText("Register loss"));
    expect(handlers.onLoss).toHaveBeenCalledWith(5);
  });

  it("calls onUndoWin with killerId when Undo Win button is clicked", () => {
    render(<ActionButtons killerId={5} {...handlers} />);
    fireEvent.click(screen.getByLabelText("Undo win"));
    expect(handlers.onUndoWin).toHaveBeenCalledWith(5);
  });

  it("calls onUndoLoss with killerId when Undo Loss button is clicked", () => {
    render(<ActionButtons killerId={5} {...handlers} />);
    fireEvent.click(screen.getByLabelText("Undo loss"));
    expect(handlers.onUndoLoss).toHaveBeenCalledWith(5);
  });
});
