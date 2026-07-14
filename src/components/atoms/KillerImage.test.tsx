import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KillerImage } from "@/components/atoms/KillerImage";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

describe("KillerImage", () => {
  it("renders the image with alt text and source", () => {
    render(<KillerImage src="/images/killers/jason.webp" alt="Jason" />);
    const img = screen.getByAltText("Jason");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/killers/jason.webp");
  });

  it("renders the gradient overlay by default and omits it when disabled", () => {
    const { container, rerender } = render(
      <KillerImage src="/a.png" alt="A" />
    );
    expect(container.querySelector(".bg-gradient-to-t")).not.toBeNull();
    rerender(<KillerImage src="/a.png" alt="A" overlay={false} />);
    expect(container.querySelector(".bg-gradient-to-t")).toBeNull();
  });

  it("renders a labelled fallback instead of an empty src when the source is missing", () => {
    const { container } = render(<KillerImage src="" alt="Trapper" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("img", { name: "Trapper" })).toBeInTheDocument();
  });
});
