import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "@/components/atoms/Skeleton";

describe("Skeleton", () => {
  it("renders a pulsing placeholder", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("animate-pulse");
    expect(el.className).toContain("bg-surface-3");
  });

  it("merges custom classes and is hidden from the a11y tree", () => {
    const { container } = render(<Skeleton className="h-10 w-full" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("h-10");
    expect(el.className).toContain("w-full");
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });
});
