import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { KillerAutocomplete } from "@/components/organisms/KillerAutocomplete";
import type { KillerStats } from "@/types/killer";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const killer = (id: number, name: string): KillerStats => ({
  id,
  name,
  imageUrl: `https://example.com/${name}.png`,
  wins: 1,
  losses: 1,
  total: 2,
  winRate: 50,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
});

const suggestions = [killer(1, "Trapper"), killer(2, "Wraith")];

function renderAutocomplete(overrides: Partial<React.ComponentProps<typeof KillerAutocomplete>> = {}) {
  const props: React.ComponentProps<typeof KillerAutocomplete> = {
    killers: suggestions,
    query: "tr",
    setQuery: vi.fn(),
    selected: null,
    suggestions,
    isOpen: true,
    highlightedIndex: 1,
    containerRef: createRef<HTMLDivElement>(),
    selectKiller: vi.fn(),
    clearSelection: vi.fn(),
    handleKeyDown: vi.fn(),
    ...overrides,
  };
  return render(<KillerAutocomplete {...props} />);
}

describe("KillerAutocomplete", () => {
  it("renders the input as a combobox tied to the listbox", () => {
    renderAutocomplete();
    const combobox = screen.getByRole("combobox");
    const listbox = screen.getByRole("listbox");

    expect(combobox).toHaveAttribute("aria-expanded", "true");
    expect(combobox).toHaveAttribute("aria-controls", listbox.id);
    expect(listbox.id).toBeTruthy();
  });

  it("points aria-activedescendant at the highlighted option", () => {
    renderAutocomplete({ highlightedIndex: 1 });
    const combobox = screen.getByRole("combobox");
    const options = screen.getAllByRole("option");

    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(combobox).toHaveAttribute("aria-activedescendant", options[1].id);
  });

  it("omits aria-activedescendant when nothing is highlighted", () => {
    renderAutocomplete({ highlightedIndex: -1 });
    expect(screen.getByRole("combobox")).not.toHaveAttribute("aria-activedescendant");
  });

  it("collapses the combobox and drops the listbox when closed", () => {
    renderAutocomplete({ isOpen: false });
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows an empty message when open with no suggestions", () => {
    renderAutocomplete({ suggestions: [], isOpen: true });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByText(/no killers found/i)).toBeInTheDocument();
  });
});
