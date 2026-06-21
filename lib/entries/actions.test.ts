import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  EMPTY_JOURNAL_CONTENT,
  JOURNAL_IMAGE_BUCKET,
  type JournalContent,
} from "@/lib/entries/content";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireProfile: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/profile/dal", () => ({
  requireProfile: mocks.requireProfile,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  uploadJournalImages,
  publishJournalEntry,
  saveJournalDraft,
} from "@/lib/entries/actions";

const PROFILE = {
  id: "11111111-1111-4111-8111-111111111111",
  preferred_timezone: "America/New_York",
};
const FORMATTED_CONTENT: JournalContent = {
  type: "doc",
  content: [
    {
      attrs: {
        textAlign: "center",
      },
      content: [
        {
          marks: [
            {
              attrs: {
                color: "#fef08a",
              },
              type: "highlight",
            },
            {
              attrs: {
                href: "https://example.com",
                target: "_blank",
              },
              type: "link",
            },
          ],
          text: "Formatted draft",
          type: "text",
        },
      ],
      type: "paragraph",
    },
    {
      attrs: {
        alt: null,
        src: "https://example.com/image.png",
        title: null,
      },
      type: "image",
    },
  ],
};
const GALLERY_CONTENT: JournalContent = {
  type: "doc",
  content: [
    {
      attrs: {
        images: [
          {
            alt: "First",
            bucket: JOURNAL_IMAGE_BUCKET,
            height: null,
            id: "image-1",
            path: `${PROFILE.id}/drafts/2026-06-15/image-1.webp`,
            previewUrl: "https://example.com/signed-draft-url",
            width: null,
          },
        ],
      },
      type: "journalImageGallery",
    },
  ],
};

function createSupabase({
  copyError = null,
  deleteError = null,
  signedUrlError = null,
  uploadError = null,
  upsertError = null,
} = {}) {
  const deleteMock = vi.fn(async () => ({ error: deleteError }));
  const eqMock = vi.fn(() => ({ eq: deleteMock }));
  const deleteTableMock = vi.fn(() => ({ eq: eqMock }));
  const upsert = vi.fn(async () => ({ error: upsertError }));
  const upload = vi.fn(async () => ({ error: uploadError }));
  const copy = vi.fn(async () => ({ error: copyError }));
  const remove = vi.fn(async () => ({ error: null }));
  const createSignedUrls = vi.fn(async (paths: string[]) => ({
    data: paths.map((path) => ({
      path,
      signedUrl: `https://example.com/signed/${path}`,
    })),
    error: signedUrlError,
  }));
  const from = vi.fn((table: string) => {
    if (table === "journal_entry_drafts") {
      return {
        delete: deleteTableMock,
        upsert,
      };
    }

    return { upsert };
  });
  const storageFrom = vi.fn(() => ({
    copy,
    createSignedUrls,
    remove,
    upload,
  }));

  return {
    copy,
    createSignedUrls,
    deleteMock,
    deleteTableMock,
    eqMock,
    from,
    remove,
    storage: {
      from: storageFrom,
    },
    storageFrom,
    upload,
    upsert,
  };
}

beforeEach(() => {
  mocks.createClient.mockReset();
  mocks.requireProfile.mockReset();
  mocks.requireProfile.mockResolvedValue(PROFILE);
  mocks.revalidatePath.mockReset();
  vi.spyOn(crypto, "randomUUID").mockReturnValue(
    "22222222-2222-4222-8222-222222222222",
  );
});

describe("journal entry actions", () => {
  it("rejects invalid dates before touching Supabase", async () => {
    await expect(
      saveJournalDraft({
        content: EMPTY_JOURNAL_CONTENT,
        entryDate: "June 15",
      }),
    ).resolves.toEqual({
      error: "Choose a valid journal date.",
      ok: false,
    });

    expect(mocks.requireProfile).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects invalid Tiptap content before touching Supabase", async () => {
    await expect(
      publishJournalEntry({
        content: { type: "paragraph" },
        entryDate: "2026-06-15",
      }),
    ).resolves.toEqual({
      error:
        "Journal content is not in a format we can save: root type is paragraph.",
      ok: false,
    });

    expect(mocks.requireProfile).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("autosaves drafts using author/date uniqueness", async () => {
    const supabase = createSupabase();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveJournalDraft({
        content: EMPTY_JOURNAL_CONTENT,
        entryDate: "2026-06-15",
      }),
    ).resolves.toMatchObject({ ok: true });

    expect(supabase.from).toHaveBeenCalledWith("journal_entry_drafts");
    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        author_id: PROFILE.id,
        content: EMPTY_JOURNAL_CONTENT,
        entry_date: "2026-06-15",
        entry_timezone: PROFILE.preferred_timezone,
      }),
      {
        onConflict: "author_id,entry_date",
      },
    );
  });

  it("autosaves formatted Tiptap content from the editor toolbar", async () => {
    const supabase = createSupabase();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveJournalDraft({
        content: FORMATTED_CONTENT,
        entryDate: "2026-06-15",
      }),
    ).resolves.toMatchObject({ ok: true });

    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        content: FORMATTED_CONTENT,
      }),
      {
        onConflict: "author_id,entry_date",
      },
    );
  });

  it("uploads journal images to the author draft path", async () => {
    const supabase = createSupabase();
    mocks.createClient.mockResolvedValue(supabase);
    const formData = new FormData();
    const file = new File(["image"], "garden.webp", {
      type: "image/webp",
    });

    formData.set("entryDate", "2026-06-15");
    formData.append("images", file);

    await expect(uploadJournalImages(formData)).resolves.toEqual({
      images: [
        {
          alt: "garden",
          bucket: JOURNAL_IMAGE_BUCKET,
          height: null,
          id: "22222222-2222-4222-8222-222222222222",
          path: `${PROFILE.id}/drafts/2026-06-15/22222222-2222-4222-8222-222222222222.webp`,
          previewUrl:
            "https://example.com/signed/11111111-1111-4111-8111-111111111111/drafts/2026-06-15/22222222-2222-4222-8222-222222222222.webp",
          width: null,
        },
      ],
      ok: true,
    });
    expect(supabase.storage.from).toHaveBeenCalledWith(JOURNAL_IMAGE_BUCKET);
    expect(supabase.upload).toHaveBeenCalledWith(
      `${PROFILE.id}/drafts/2026-06-15/22222222-2222-4222-8222-222222222222.webp`,
      file,
      {
        cacheControl: "3600",
        contentType: "image/webp",
        upsert: false,
      },
    );
  });

  it("rejects HEIC uploads before touching Supabase", async () => {
    const formData = new FormData();
    const file = new File(["heic"], "garden.heic", {
      type: "image/heic",
    });

    formData.set("entryDate", "2026-06-15");
    formData.append("images", file);

    await expect(uploadJournalImages(formData)).resolves.toEqual({
      error: "Upload JPEG, PNG, or WebP images. HEIC is not supported yet.",
      ok: false,
    });
    expect(mocks.requireProfile).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects uploads with more than five images before touching Supabase", async () => {
    const formData = new FormData();

    formData.set("entryDate", "2026-06-15");
    Array.from({ length: 6 }, (_, index) => {
      formData.append(
        "images",
        new File(["image"], `image-${index}.png`, {
          type: "image/png",
        }),
      );
    });

    await expect(uploadJournalImages(formData)).resolves.toEqual({
      error: "Upload 5 images or fewer.",
      ok: false,
    });
    expect(mocks.requireProfile).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("publishes gallery images by copying drafts and stripping preview URLs", async () => {
    const supabase = createSupabase();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      publishJournalEntry({
        content: GALLERY_CONTENT,
        entryDate: "2026-06-15",
      }),
    ).resolves.toMatchObject({ ok: true });

    const publishedPath = `${PROFILE.id}/published/2026-06-15/22222222-2222-4222-8222-222222222222.webp`;

    expect(supabase.copy).toHaveBeenCalledWith(
      `${PROFILE.id}/drafts/2026-06-15/image-1.webp`,
      publishedPath,
    );
    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        content: {
          type: "doc",
          content: [
            {
              attrs: {
                images: [
                  {
                    alt: "First",
                    bucket: JOURNAL_IMAGE_BUCKET,
                    height: null,
                    id: "image-1",
                    path: publishedPath,
                    width: null,
                  },
                ],
              },
              type: "journalImageGallery",
            },
          ],
        },
      }),
      {
        onConflict: "author_id,entry_date",
      },
    );
    expect(supabase.remove).toHaveBeenCalledWith([
      `${PROFILE.id}/drafts/2026-06-15/image-1.webp`,
    ]);
  });

  it("publishes entries and clears the matching server draft", async () => {
    const supabase = createSupabase();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      publishJournalEntry({
        content: EMPTY_JOURNAL_CONTENT,
        entryDate: "2026-06-15",
      }),
    ).resolves.toMatchObject({ ok: true });

    expect(supabase.from).toHaveBeenCalledWith("journal_entries");
    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        author_id: PROFILE.id,
        content: EMPTY_JOURNAL_CONTENT,
        entry_date: "2026-06-15",
        entry_timezone: PROFILE.preferred_timezone,
      }),
      {
        onConflict: "author_id,entry_date",
      },
    );
    expect(supabase.from).toHaveBeenCalledWith("journal_entry_drafts");
    expect(supabase.deleteTableMock).toHaveBeenCalled();
    expect(supabase.eqMock).toHaveBeenCalledWith("author_id", PROFILE.id);
    expect(supabase.deleteMock).toHaveBeenCalledWith(
      "entry_date",
      "2026-06-15",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/jots");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/entries");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/write/2026-06-15");
  });
});
