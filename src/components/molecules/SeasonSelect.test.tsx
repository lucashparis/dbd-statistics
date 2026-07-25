import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeasonSelect } from "@/components/molecules/SeasonSelect";
import { useSeason } from "@/contexts/SeasonContext";
import { listSeasons } from "@/lib/seasons";

vi.mock("@/contexts/SeasonContext", () => ({ useSeason: vi.fn() }));

const setSeason = vi.fn();

function mockSeason(season: number | "all") {
  vi.mocked(useSeason).mockReturnValue({
    season,
    setSeason,
    seasons: listSeasons(),
    isReadOnly: false,
  });
}

function trigger() {
  return screen.getByRole("button", { name: "Season" });
}

async function open() {
  await userEvent.click(trigger());
}

describe("SeasonSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSeason(1);
  });

  it("is a labelled trigger showing the active season", () => {
    render(<SeasonSelect />);
    expect(trigger()).toHaveTextContent("Season 1");
  });

  it("shows the all-time selection on the trigger", () => {
    mockSeason("all");
    render(<SeasonSelect />);
    expect(trigger()).toHaveTextContent("All time");
  });

  it("lists every season down to zero plus the all-time option", async () => {
    render(<SeasonSelect />);
    await open();
    const labels = screen.getAllByRole("menuitemradio").map((i) => i.textContent);
    expect(labels).toContain("Season 1");
    expect(labels).toContain("Season 0");
    expect(labels).toContain("All time");
  });

  it("marks the active option as checked", async () => {
    mockSeason(0);
    render(<SeasonSelect />);
    await open();
    expect(screen.getByRole("menuitemradio", { name: /Season 0/ })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByRole("menuitemradio", { name: /Season 1/ })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("reports a numeric season as a number, not a string", async () => {
    render(<SeasonSelect />);
    await open();
    await userEvent.click(screen.getByRole("menuitemradio", { name: /Season 0/ }));
    expect(setSeason).toHaveBeenCalledWith(0);
  });

  it("reports the all-time selection as the 'all' literal", async () => {
    render(<SeasonSelect />);
    await open();
    await userEvent.click(screen.getByRole("menuitemradio", { name: /All time/ }));
    expect(setSeason).toHaveBeenCalledWith("all");
  });
});
