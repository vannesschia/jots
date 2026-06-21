// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import {
  isAcceptedJournalImageInputFile,
} from "@/lib/entries/prepare-journal-images";

describe("isAcceptedJournalImageInputFile", () => {
  it("rejects HEIC images by MIME type", () => {
    const heic = new File(["heic"], "garden.heic", {
      type: "image/heic",
    });

    expect(isAcceptedJournalImageInputFile(heic)).toBe(false);
  });

  it("rejects HEIC files by extension when the browser omits the MIME type", () => {
    const heic = new File(["heic"], "garden.HEIC", {
      type: "",
    });

    expect(isAcceptedJournalImageInputFile(heic)).toBe(false);
  });

  it("accepts browser-renderable image files", () => {
    const webp = new File(["webp"], "garden.webp", {
      type: "image/webp",
    });

    expect(isAcceptedJournalImageInputFile(webp)).toBe(true);
  });

  it("rejects accepted extensions when the MIME type is missing", () => {
    const webp = new File(["webp"], "garden.webp", {
      type: "",
    });

    expect(isAcceptedJournalImageInputFile(webp)).toBe(false);
  });

  it("rejects unsupported empty-type files", () => {
    const file = new File(["text"], "notes.txt", {
      type: "",
    });

    expect(isAcceptedJournalImageInputFile(file)).toBe(false);
  });
});
