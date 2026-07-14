import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { EntityAutocomplete } from "@/components/organisms/EntityAutocomplete";
import type { AutocompleteItem } from "@/hooks/useAutocomplete";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const item = (id: number, name: string): AutocompleteItem => ({
  id,
  name,
  imageUrl: `https://example.com/${name}.png`,
});

const suggestions = [item(1, "Dwight"), item(2, "Meg")];

function renderAutocomplete(
  overrides: Partial<React.ComponentProps<typeof EntityAutocomplete>> = {}
) {
  const props: React.ComponentProps<typeof EntityAutocomplete> = {
    query: "d",
    setQuery: vi.fn(),
    selected: null,
    suggestions,
    isOpen: true,
    highlightedIndex: 1,
    containerRef: createRef<HTMLDivElement>(),
    select: vi.fn(),
    clearSelection: vi.fn(),
    handleKeyDown: vi.fn(),
    searchLabel: "Search survivors",
    suggestionsLabel: "Survivor suggestions",
    notFoundLabel: "No survivors found for",
    ...overrides,
  };
  return render(<EntityAutocomplete {...props} />);
}

describe("EntityAutocomplete", () => {
  it("renders the input as a combobox tied to the listbox", () => {
    renderAutocomplete();
    const combobox = screen.getByRole("combobox");
    const listbox = screen.getByRole("listbox");
    expect(combobox).toHaveAttribute("aria-expanded", "true");
    expect(combobox).toHaveAttribute("aria-controls", listbox.id);
    expect(listbox).toHaveAttribute("aria-label", "Survivor suggestions");
  });

  it("points aria-activedescendant at the highlighted option", () => {
    renderAutocomplete({ highlightedIndex: 1 });
    const combobox = screen.getByRole("combobox");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(combobox).toHaveAttribute("aria-activedescendant", options[1].id);
  });

  it("collapses the combobox and drops the listbox when closed", () => {
    renderAutocomplete({ isOpen: false });
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows the provided empty message when open with no suggestions", () => {
    renderAutocomplete({ suggestions: [], isOpen: true });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByText(/no survivors found for/i)).toBeInTheDocument();
  });
});
