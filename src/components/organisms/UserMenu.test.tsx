import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserMenu } from "@/components/organisms/UserMenu";
import { useSession } from "next-auth/react";
import { useProfile } from "@/hooks/useProfile";
import { createQueryWrapper } from "@/test/queryWrapper";

function renderMenu() {
  const { Wrapper } = createQueryWrapper();
  return render(<UserMenu />, { wrapper: Wrapper });
}

vi.mock("next-auth/react", () => ({ useSession: vi.fn(), signOut: vi.fn() }));
vi.mock("@/hooks/useProfile", () => ({ useProfile: vi.fn() }));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1", email: "lucas@x.com" }, expires: "2999" },
      status: "authenticated",
      update: vi.fn(),
    } as never);
    vi.mocked(useProfile).mockReturnValue({
      profile: {
        name: "Lucas",
        nick: "dead",
        channelUrl: null,
        mainKiller: { id: 1, name: "Trapper", imageUrl: "https://x/t.png" },
        isPublic: true,
      },
      isLoading: false,
      error: null,
      saving: false,
      removing: false,
      saveProfile: vi.fn(),
      removeProfile: vi.fn(),
    } as never);
  });

  it("renders the avatar trigger using the main killer image", () => {
    renderMenu();
    expect(screen.getByRole("button", { name: /open user menu/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Lucas" })).toHaveAttribute("src", "https://x/t.png");
  });

  it("keeps the profile dialog closed until opened", () => {
    renderMenu();
    expect(screen.queryByText("Your profile")).not.toBeInTheDocument();
  });
});
