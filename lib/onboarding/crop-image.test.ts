// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AVATAR_OUTPUT_SIZE,
  AVATAR_WEBP_QUALITY,
  cropImageToWebp,
} from "@/lib/onboarding/crop-image";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("cropImageToWebp", () => {
  it("draws the selected area into a 512px WebP file", async () => {
    const drawImage = vi.fn();
    const context = {
      drawImage,
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
    } as unknown as CanvasRenderingContext2D;
    const canvas = {
      getContext: vi.fn(() => context),
      height: 0,
      toBlob: vi.fn((callback: BlobCallback, type?: string, quality?: number) => {
        expect(type).toBe("image/webp");
        expect(quality).toBe(AVATAR_WEBP_QUALITY);
        callback(new Blob(["cropped"], { type: "image/webp" }));
      }),
      width: 0,
    } as unknown as HTMLCanvasElement;
    const createElement = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation((tagName) =>
      tagName === "canvas" ? canvas : createElement(tagName),
    );
    vi.stubGlobal(
      "Image",
      class {
        onerror: OnErrorEventHandler | null = null;
        onload: (() => void) | null = null;

        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );

    const cropArea = { height: 240, width: 240, x: 32, y: 48 };
    const file = await cropImageToWebp("blob:source", cropArea);

    expect(canvas.width).toBe(AVATAR_OUTPUT_SIZE);
    expect(canvas.height).toBe(AVATAR_OUTPUT_SIZE);
    expect(context.imageSmoothingEnabled).toBe(true);
    expect(context.imageSmoothingQuality).toBe("high");
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      32,
      48,
      240,
      240,
      0,
      0,
      AVATAR_OUTPUT_SIZE,
      AVATAR_OUTPUT_SIZE,
    );
    expect(file.name).toBe("avatar.webp");
    expect(file.type).toBe("image/webp");
  });

  it("rejects invalid crop dimensions", async () => {
    await expect(
      cropImageToWebp("blob:source", {
        height: 0,
        width: 100,
        x: 0,
        y: 0,
      }),
    ).rejects.toThrow("Choose a valid crop area.");
  });
});
