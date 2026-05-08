import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TabNav } from "@/components/molecules/TabNav";
import type { TabId } from "@/components/molecules/TabNav";

const tabs = [
  { id: "killers" as TabId, label: "Killers" },
  { id: "statistics" as TabId, label: "Statistics" },
];

describe("TabNav", () => {
  it("renders all tab labels", () => {
    render(<TabNav tabs={tabs} activeTab="killers" onTabChange={() => {}} />);
    expect(screen.getByText("Killers")).toBeInTheDocument();
    expect(screen.getByText("Statistics")).toBeInTheDocument();
  });

  it("marks the active tab with aria-selected", () => {
    render(<TabNav tabs={tabs} activeTab="statistics" onTabChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "Statistics" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Killers" })).toHaveAttribute("aria-selected", "false");
  });

  it("calls onTabChange with the correct id when a tab is clicked", async () => {
    const onTabChange = vi.fn();
    render(<TabNav tabs={tabs} activeTab="killers" onTabChange={onTabChange} />);
    await userEvent.click(screen.getByRole("tab", { name: "Statistics" }));
    expect(onTabChange).toHaveBeenCalledWith("statistics");
  });

  it("renders a scrollable nav with overflow-x-auto", () => {
    render(<TabNav tabs={tabs} activeTab="killers" onTabChange={() => {}} />);
    const nav = screen.getByRole("tablist");
    expect(nav.className).toContain("overflow-x-auto");
  });

  it("renders each tab button with shrink-0 to prevent layout collapse", () => {
    render(<TabNav tabs={tabs} activeTab="killers" onTabChange={() => {}} />);
    screen.getAllByRole("tab").forEach((btn) => {
      expect(btn.className).toContain("shrink-0");
    });
  });
});
