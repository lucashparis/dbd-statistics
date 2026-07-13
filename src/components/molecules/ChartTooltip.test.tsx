import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChartTooltip } from "@/components/molecules/ChartTooltip";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const payload = (name: string, imageUrl: string, total: number) => [
  { name, value: total, payload: { name, imageUrl, total } },
];

describe("ChartTooltip", () => {
  it("renders nothing when inactive", () => {
    const { container } = render(
      <ChartTooltip active={false} payload={payload("Trapper", "x.png", 8)} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the name and match count when active", () => {
    render(<ChartTooltip active payload={payload("Trapper", "x.png", 8)} />);
    expect(screen.getByText("Trapper")).toBeInTheDocument();
    expect(screen.getByText("8 matches")).toBeInTheDocument();
  });

  it("renders the portrait when an image url is present", () => {
    render(<ChartTooltip active payload={payload("Trapper", "x.png", 8)} />);
    expect(screen.getByAltText("Trapper")).toBeInTheDocument();
  });

  it("omits the image (no empty src) when the url is empty", () => {
    render(<ChartTooltip active payload={payload("Other", "", 12)} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });
});
