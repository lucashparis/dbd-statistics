import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "@/components/templates/AppShell";
import type { TabId } from "@/components/molecules/TabNav";

vi.mock("@/components/organisms/AppHeader", () => ({ AppHeader: () => <header /> }));

function renderShell(activeTab: TabId = "killers") {
  const onTabChange = vi.fn();
  render(
    <AppShell
      activeTab={activeTab}
      onTabChange={onTabChange}
      killersContent={<div>killers-panel</div>}
      streakContent={<div>streak-panel</div>}
      statisticsContent={<div>statistics-panel</div>}
      teamContent={<div>team-panel</div>}
      historyContent={<div>history-panel</div>}
      communityContent={<div>community-panel</div>}
      rankContent={<div>rank-panel</div>}
    />
  );
  return { onTabChange };
}

describe("AppShell", () => {
  it("renders a Rank tab next to Community", () => {
    renderShell();
    expect(screen.getByRole("tab", { name: "Community" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Rank" })).toBeInTheDocument();
  });

  it("reveals the rank panel and hides the others when Rank is active", () => {
    renderShell("rank");
    expect(screen.getByText("rank-panel").closest("[role='tabpanel']")).not.toHaveAttribute("hidden");
    expect(screen.getByText("killers-panel").closest("[role='tabpanel']")).toHaveAttribute("hidden");
  });

  it("notifies the parent when the Rank tab is clicked", async () => {
    const { onTabChange } = renderShell("killers");
    await userEvent.click(screen.getByRole("tab", { name: "Rank" }));
    expect(onTabChange).toHaveBeenCalledWith("rank");
  });
});
