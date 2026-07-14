import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChannelLinkButton } from "@/components/molecules/ChannelLinkButton";

describe("ChannelLinkButton", () => {
  it("renders a safe external link when a channel url is provided", () => {
    render(<ChannelLinkButton channelUrl="https://twitch.tv/x" />);
    const link = screen.getByRole("link", { name: /visit channel/i });
    expect(link).toHaveAttribute("href", "https://twitch.tv/x");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders nothing when there is no channel url", () => {
    const { container } = render(<ChannelLinkButton channelUrl={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
