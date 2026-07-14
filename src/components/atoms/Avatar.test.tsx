import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "@/components/atoms/Avatar";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

describe("Avatar", () => {
  it("renders the killer image when an imageUrl is provided", () => {
    render(<Avatar imageUrl="https://x/n.png" label="Lucas" />);
    expect(screen.getByRole("img", { name: "Lucas" })).toHaveAttribute("src", "https://x/n.png");
  });

  it("falls back to the first letter of the label when there is no image", () => {
    render(<Avatar label="Lucas" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
  });

  it("renders neither an image nor an initial when the label is empty", () => {
    render(<Avatar label="" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
