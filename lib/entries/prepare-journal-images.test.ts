// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  heic2any: vi.fn(),
}));

vi.mock("heic2any", () => ({
  default: mocks.heic2any,
}));

import {
  isAcceptedJournalImageInputFile,
  prepareJournalImageFiles,
} from "@/lib/entries/prepare-journal-images";

beforeEach(() => {
  mocks.heic2any.mockReset();
  mocks.heic2any.mockResolvedValue(
    new Blob(["converted"], {
      type: "image/webp",
    }),
  );
});

describe("prepareJournalImageFiles", () => {
  it("converts HEIC images to WebP files", async () => {
    const heic = new File(["heic"], "garden.heic", {
      type: "image/heic",
    });

    const [prepared] = await prepareJournalImageFiles([heic]);

    expect(mocks.heic2any).toHaveBeenCalledWith({
      blob: heic,
      quality: 0.9,
      toType: "image/webp",
    });
    expect(prepared.name).toBe("garden.webp");
    expect(prepared.type).toBe("image/webp");
  });

  it("detects HEIC files by extension when the browser omits the MIME type", () => {
    const heic = new File(["heic"], "garden.HEIC", {
      type: "",
    });

    expect(isAcceptedJournalImageInputFile(heic)).toBe(true);
  });

  it("keeps browser-renderable image files unchanged", async () => {
    const webp = new File(["webp"], "garden.webp", {
      type: "image/webp",
    });

    await expect(prepareJournalImageFiles([webp])).resolves.toEqual([webp]);
    expect(mocks.heic2any).not.toHaveBeenCalled();
  });

  it("rejects unsupported empty-type files", () => {
    const file = new File(["text"], "notes.txt", {
      type: "",
    });

    expect(isAcceptedJournalImageInputFile(file)).toBe(false);
  });
});
