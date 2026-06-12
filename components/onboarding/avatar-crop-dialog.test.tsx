// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CROP_AREA = { height: 240, width: 240, x: 32, y: 48 };
const CROPPED_FILE = new File(["cropped"], "avatar.webp", {
  type: "image/webp",
});

const { cropImageToWebp } = vi.hoisted(() => ({
  cropImageToWebp: vi.fn(),
}));

vi.mock("@/lib/onboarding/crop-image", () => ({
  cropImageToWebp,
}));

vi.mock("react-easy-crop", () => ({
  default: ({
    objectFit,
    onCropComplete,
    zoom,
  }: {
    objectFit: string;
    onCropComplete: (
      croppedArea: { height: number; width: number; x: number; y: number },
      croppedAreaPixels: {
        height: number;
        width: number;
        x: number;
        y: number;
      },
    ) => void;
    zoom: number;
  }) => (
    <button
      onClick={() =>
        onCropComplete(
          { height: 50, width: 50, x: 25, y: 25 },
          CROP_AREA,
        )
      }
      type="button"
    >
      Set crop at {zoom}× using {objectFit}
    </button>
  ),
}));

import { AvatarCropDialog } from "@/components/onboarding/avatar-crop-dialog";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  cropImageToWebp.mockResolvedValue(CROPPED_FILE);
});

function renderDialog(
  props: Partial<React.ComponentProps<typeof AvatarCropDialog>> = {},
) {
  const onConfirm = vi.fn();
  const onDiscard = vi.fn();

  render(
    <AvatarCropDialog
      onConfirm={onConfirm}
      onDiscard={onDiscard}
      open
      sourceUrl="blob:source"
      {...props}
    />,
  );

  return { onConfirm, onDiscard };
}

async function setCrop(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Set crop at/ }));
}

describe("AvatarCropDialog", () => {
  it("passes the selected crop to WebP generation and confirms the result", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await setCrop(user);
    await user.click(screen.getByRole("button", { name: "Choose" }));

    expect(cropImageToWebp).toHaveBeenCalledWith("blob:source", CROP_AREA);
    expect(onConfirm).toHaveBeenCalledWith(CROPPED_FILE);
  });

  it("keeps the dialog open and reports crop generation failures", async () => {
    const user = userEvent.setup();
    cropImageToWebp.mockRejectedValueOnce(new Error("Canvas failed."));
    renderDialog();

    await setCrop(user);
    await user.click(screen.getByRole("button", { name: "Choose" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Canvas failed.",
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("cancels the pending selection", async () => {
    const user = userEvent.setup();
    const { onDiscard } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("renders a full-width square cropper that covers the frame", () => {
    renderDialog();

    const cropArea = screen.getByLabelText("Avatar crop area");

    expect(cropArea.className).toContain("w-full");
    expect(cropArea.className).toContain("aspect-square");
    expect(
      screen.getByRole("button", { name: "Set crop at 1× using cover" }),
    ).toBeTruthy();
  });
});
