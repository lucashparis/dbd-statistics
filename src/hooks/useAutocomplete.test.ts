import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import type { KillerStats } from "@/types/killer";

function makeKiller(id: number, name: string): KillerStats {
  return {
    id,
    name,
    imageUrl: "",
    wins: 0,
    losses: 0,
    total: 0,
    winRate: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

const killers: KillerStats[] = [
  makeKiller(1, "Trapper"),
  makeKiller(2, "Wraith"),
  makeKiller(3, "Hillbilly"),
];

describe("useAutocomplete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("setQuery opens dropdown and filters suggestions by name", () => {
    const { result } = renderHook(() => useAutocomplete(killers));
    act(() => result.current.setQuery("trap"));
    expect(result.current.isOpen).toBe(true);
    expect(result.current.suggestions).toHaveLength(1);
    expect(result.current.suggestions[0].name).toBe("Trapper");
  });

  it("setQuery with empty string closes dropdown and clears suggestions", () => {
    const { result } = renderHook(() => useAutocomplete(killers));
    act(() => result.current.setQuery("trap"));
    act(() => result.current.setQuery(""));
    expect(result.current.isOpen).toBe(false);
    expect(result.current.suggestions).toHaveLength(0);
  });

  it("select sets selected, updates query and closes dropdown", () => {
    const { result } = renderHook(() => useAutocomplete(killers));
    act(() => result.current.setQuery("trap"));
    act(() => result.current.select(killers[0]));
    expect(result.current.selected).toBe(killers[0]);
    expect(result.current.query).toBe("Trapper");
    expect(result.current.isOpen).toBe(false);
  });

  it("clearSelection resets all state", () => {
    const { result } = renderHook(() => useAutocomplete(killers));
    act(() => result.current.select(killers[0]));
    act(() => result.current.clearSelection());
    expect(result.current.selected).toBeNull();
    expect(result.current.query).toBe("");
    expect(result.current.isOpen).toBe(false);
  });

  it("ArrowDown increases highlightedIndex", () => {
    const { result } = renderHook(() => useAutocomplete(killers));
    act(() => result.current.setQuery("r")); // matches Trapper, Wraith
    act(() =>
      result.current.handleKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent)
    );
    expect(result.current.highlightedIndex).toBe(0);
    act(() =>
      result.current.handleKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent)
    );
    expect(result.current.highlightedIndex).toBe(1);
  });

  it("ArrowUp decreases highlightedIndex and does not go below 0", () => {
    const { result } = renderHook(() => useAutocomplete(killers));
    act(() => result.current.setQuery("r"));
    act(() =>
      result.current.handleKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent)
    );
    expect(result.current.highlightedIndex).toBe(0);
    act(() =>
      result.current.handleKeyDown({
        key: "ArrowUp",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent)
    );
    expect(result.current.highlightedIndex).toBe(0);
  });

  it("Enter selects the highlighted killer and closes dropdown", () => {
    const { result } = renderHook(() => useAutocomplete(killers));
    act(() => result.current.setQuery("r"));
    act(() =>
      result.current.handleKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent)
    );
    act(() =>
      result.current.handleKeyDown({
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent)
    );
    expect(result.current.selected).not.toBeNull();
    expect(result.current.isOpen).toBe(false);
  });

  it("Escape closes the dropdown without selecting", () => {
    const { result } = renderHook(() => useAutocomplete(killers));
    act(() => result.current.setQuery("trap"));
    act(() =>
      result.current.handleKeyDown({
        key: "Escape",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent)
    );
    expect(result.current.isOpen).toBe(false);
    expect(result.current.selected).toBeNull();
  });

  it("handleKeyDown is a no-op when dropdown is closed", () => {
    const { result } = renderHook(() => useAutocomplete(killers));
    act(() =>
      result.current.handleKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent)
    );
    expect(result.current.highlightedIndex).toBe(-1);
  });
});
