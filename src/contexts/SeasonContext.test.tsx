import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { SeasonProvider, useSeason } from "@/contexts/SeasonContext";
import { currentSeasonId, type SeasonSelection } from "@/lib/seasons";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const fetchMock = vi.fn();

function Probe() {
  const { season, setSeason, isReadOnly } = useSeason();
  return (
    <div>
      <span data-testid="season">{String(season)}</span>
      <span data-testid="read-only">{String(isReadOnly)}</span>
      <button onClick={() => setSeason(0)}>past</button>
      <button onClick={() => setSeason("all")}>all</button>
      <button onClick={() => setSeason(currentSeasonId())}>current</button>
    </div>
  );
}

function renderProvider(initialSeason: SeasonSelection) {
  return render(
    <SeasonProvider initialSeason={initialSeason}>
      <Probe />
    </SeasonProvider>
  );
}

describe("SeasonContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("seeds the selection from the resolved preference", () => {
    renderProvider(0);
    expect(screen.getByTestId("season")).toHaveTextContent("0");
  });

  it("marks a past season read-only and the current season writable", async () => {
    renderProvider(currentSeasonId());
    expect(screen.getByTestId("read-only")).toHaveTextContent("false");

    await userEvent.click(screen.getByText("past"));
    expect(screen.getByTestId("read-only")).toHaveTextContent("true");
  });

  it("treats all time as writable", async () => {
    renderProvider(0);
    await userEvent.click(screen.getByText("all"));
    expect(screen.getByTestId("read-only")).toHaveTextContent("false");
  });

  it("persists a pinned past season as its number", async () => {
    renderProvider(currentSeasonId());
    await userEvent.click(screen.getByText("past"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ season: "0" });
  });

  it("persists the current season as the 'current' intent so it survives a rollover", async () => {
    renderProvider(0);
    await userEvent.click(screen.getByText("current"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ season: "current" });
  });

  it("does not call the API when the selection did not change", async () => {
    renderProvider(0);
    await userEvent.click(screen.getByText("past"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rolls the selection back and warns when persisting fails", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    renderProvider(currentSeasonId());

    await userEvent.click(screen.getByText("past"));

    await waitFor(() =>
      expect(screen.getByTestId("season")).toHaveTextContent(String(currentSeasonId()))
    );
    expect(toast.error).toHaveBeenCalledWith("Could not switch season");
  });

  it("throws when used outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/SeasonProvider/);
    spy.mockRestore();
  });
});
