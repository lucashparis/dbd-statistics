import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KillerSearchInput } from "@/components/molecules/KillerSearchInput";

const baseProps = {
  value: "",
  onChange: () => {},
  onClear: () => {},
};

describe("KillerSearchInput", () => {
  it("exposes a default accessible label", () => {
    render(<KillerSearchInput {...baseProps} />);
    expect(screen.getByLabelText("Search killers")).toBeInTheDocument();
  });

  it("uses a custom accessible label when provided", () => {
    render(<KillerSearchInput {...baseProps} ariaLabel="Find a killer" />);
    expect(screen.getByLabelText("Find a killer")).toBeInTheDocument();
  });

  it("applies combobox ARIA attributes when wired as a combobox", () => {
    render(
      <KillerSearchInput
        {...baseProps}
        role="combobox"
        ariaAutoComplete="list"
        ariaExpanded
        ariaControls="listbox-1"
        ariaActiveDescendant="option-2"
      />
    );
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", "listbox-1");
    expect(input).toHaveAttribute("aria-activedescendant", "option-2");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  it("calls onChange as the user types", async () => {
    const onChange = vi.fn();
    render(<KillerSearchInput {...baseProps} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Search killers"), "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("shows the clear button only when there is a value", async () => {
    const onClear = vi.fn();
    const { rerender } = render(<KillerSearchInput {...baseProps} onClear={onClear} />);
    expect(screen.queryByLabelText("Clear search")).not.toBeInTheDocument();

    rerender(<KillerSearchInput {...baseProps} value="trap" onClear={onClear} />);
    await userEvent.click(screen.getByLabelText("Clear search"));
    expect(onClear).toHaveBeenCalled();
  });
});
