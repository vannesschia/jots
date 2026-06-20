import { describe, expect, it } from "vitest";

import {
  JOURNAL_IMAGE_BUCKET,
  isJournalContent,
  normalizeJournalContent,
} from "@/lib/entries/content";

describe("journal content validation", () => {
  it("accepts Tiptap nodes and marks with null attrs", () => {
    expect(
      isJournalContent({
        type: "doc",
        content: [
          {
            attrs: {
              textAlign: null,
            },
            content: [
              {
                marks: [
                  {
                    attrs: null,
                    type: "bold",
                  },
                ],
                text: "Draft text",
                type: "text",
              },
            ],
            type: "paragraph",
          },
        ],
      }),
    ).toBe(true);
  });

  it("rejects non-document roots", () => {
    expect(
      isJournalContent({
        type: "paragraph",
      }),
    ).toBe(false);
  });

  it("rejects non-serializable content", () => {
    expect(
      isJournalContent({
        type: "doc",
        content: [
          {
            attrs: {
              onClick: () => null,
            },
            type: "paragraph",
          },
        ],
      }),
    ).toBe(false);
  });

  it("normalizes valid content into plain JSON", () => {
    const content = {
      type: "doc",
      content: [
        {
          attrs: {
            textAlign: undefined,
          },
          type: "paragraph",
        },
      ],
    };

    expect(normalizeJournalContent(content)).toEqual({
      type: "doc",
      content: [
        {
          attrs: {},
          type: "paragraph",
        },
      ],
    });
  });

  it("normalizes gallery nodes and strips transient preview URLs by default", () => {
    expect(
      normalizeJournalContent({
        type: "doc",
        content: [
          {
            attrs: {
              images: [
                {
                  alt: "Garden",
                  bucket: JOURNAL_IMAGE_BUCKET,
                  height: null,
                  id: "image-1",
                  path: "11111111-1111-4111-8111-111111111111/drafts/2026-06-15/image-1.webp",
                  previewUrl: "https://example.com/signed",
                  width: null,
                },
              ],
            },
            type: "journalImageGallery",
          },
        ],
      }),
    ).toEqual({
      type: "doc",
      content: [
        {
          attrs: {
            images: [
              {
                alt: "Garden",
                bucket: JOURNAL_IMAGE_BUCKET,
                height: null,
                id: "image-1",
                path: "11111111-1111-4111-8111-111111111111/drafts/2026-06-15/image-1.webp",
                width: null,
              },
            ],
          },
          type: "journalImageGallery",
        },
      ],
    });
  });

  it("preserves gallery preview URLs when requested for local drafts", () => {
    const content = normalizeJournalContent(
      {
        type: "doc",
        content: [
          {
            attrs: {
              images: [
                {
                  alt: null,
                  bucket: JOURNAL_IMAGE_BUCKET,
                  height: null,
                  id: "image-1",
                  path: "11111111-1111-4111-8111-111111111111/drafts/2026-06-15/image-1.webp",
                  previewUrl: "https://example.com/signed",
                  width: null,
                },
              ],
            },
            type: "journalImageGallery",
          },
        ],
      },
      {
        preserveTransientImageUrls: true,
      },
    );

    expect(
      content?.content?.[0]?.attrs?.images?.[0]?.previewUrl,
    ).toBe("https://example.com/signed");
  });

  it("rejects gallery nodes without durable image paths", () => {
    expect(
      normalizeJournalContent({
        type: "doc",
        content: [
          {
            attrs: {
              images: [
                {
                  bucket: JOURNAL_IMAGE_BUCKET,
                  id: "image-1",
                  previewUrl: "https://example.com/signed",
                },
              ],
            },
            type: "journalImageGallery",
          },
        ],
      }),
    ).toBeNull();
  });

  it("rejects gallery nodes with more than five images", () => {
    expect(
      normalizeJournalContent({
        type: "doc",
        content: [
          {
            attrs: {
              images: Array.from({ length: 6 }, (_, index) => ({
                alt: null,
                bucket: JOURNAL_IMAGE_BUCKET,
                height: null,
                id: `image-${index}`,
                path: `11111111-1111-4111-8111-111111111111/drafts/2026-06-15/image-${index}.webp`,
                width: null,
              })),
            },
            type: "journalImageGallery",
          },
        ],
      }),
    ).toBeNull();
  });
});
