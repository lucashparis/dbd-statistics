import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileDialog } from "@/components/organisms/ProfileDialog";
import { createQueryWrapper } from "@/test/queryWrapper";
import type { MyProfile } from "@/types/profile";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const profile: MyProfile = {
  name: "Lucas",
  nick: "dead",
  channelUrl: null,
  mainKiller: null,
  isPublic: true,
};

function setup(overrides: Partial<React.ComponentProps<typeof ProfileDialog>> = {}) {
  const onSave = vi.fn().mockResolvedValue(true);
  const onOpenChange = vi.fn();
  const onRemove = vi.fn().mockResolvedValue(undefined);
  const { Wrapper } = createQueryWrapper();
  render(
    <Wrapper>
      <ProfileDialog
        open
        onOpenChange={onOpenChange}
        profile={profile}
        onSave={onSave}
        saving={false}
        onRemove={onRemove}
        removing={false}
        {...overrides}
      />
    </Wrapper>
  );
  return { onSave, onOpenChange, onRemove };
}

describe("ProfileDialog", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] })
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("prefills the form from the current profile", () => {
    setup();
    expect(screen.getByLabelText("Name")).toHaveValue("Lucas");
    expect(screen.getByLabelText(/nick/i)).toHaveValue("dead");
  });

  it("rejects a non-https channel link and does not save", async () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByLabelText(/channel link/i), {
      target: { value: "http://insecure.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/valid https url/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves the profile and closes on success", async () => {
    const { onSave, onOpenChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        name: "Lucas",
        nick: "dead",
        channelUrl: null,
        mainKillerId: null,
      })
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("removes the profile when the remove action is used", async () => {
    const { onRemove } = setup();
    fireEvent.click(screen.getByRole("button", { name: /remove profile/i }));
    await waitFor(() => expect(onRemove).toHaveBeenCalled());
  });
});
