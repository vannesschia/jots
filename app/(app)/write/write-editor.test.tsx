// @vitest-environment jsdom

import type { ComponentProps } from "react";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EMPTY_JOURNAL_CONTENT,
  type JournalContent,
} from "@/lib/entries/content";

const navigation = vi.hoisted(() => ({
  back: vi.fn(),
}));

const editorMocks = vi.hoisted(() => ({
  capturedOptions: null as null | {
    content: JournalContent;
    onUpdate: (payload: { editor: unknown }) => void;
  },
  chain: {
    extendMarkRange: vi.fn(),
    focus: vi.fn(),
    redo: vi.fn(),
    insertContent: vi.fn(),
    run: vi.fn(),
    setImage: vi.fn(),
    setLink: vi.fn(),
    unsetLink: vi.fn(),
    undo: vi.fn(),
  },
  fakeEditor: {
    can: vi.fn(),
    chain: vi.fn(),
    commands: {
      setContent: vi.fn(),
    },
    getAttributes: vi.fn(),
    getJSON: vi.fn(),
    isActive: vi.fn(),
  },
}));

const actionMocks = vi.hoisted(() => ({
  hydrateJournalContentImages: vi.fn(),
  publishJournalEntry: vi.fn(),
  saveJournalDraft: vi.fn(),
  uploadJournalImages: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: navigation.back }),
}));
vi.mock("@tiptap/extension-highlight", () => ({
  default: {
    configure: vi.fn(() => ({})),
  },
}));
vi.mock("@tiptap/extension-image", () => ({
  default: {},
}));
vi.mock("@tiptap/extension-subscript", () => ({
  default: {},
}));
vi.mock("@tiptap/extension-superscript", () => ({
  default: {},
}));
vi.mock("@tiptap/extension-text-align", () => ({
  default: {
    configure: vi.fn(() => ({})),
  },
}));
vi.mock("@tiptap/extensions/placeholder", () => ({
  Placeholder: {
    configure: vi.fn(() => ({})),
  },
}));
vi.mock("@tiptap/starter-kit", () => ({
  default: {
    configure: vi.fn(() => ({})),
  },
}));
vi.mock("@tiptap/react", () => ({
  EditorContent: ({ editor }: { editor: unknown }) =>
    editor ? <div role="textbox" /> : null,
  useEditor: (options: typeof editorMocks.capturedOptions) => {
    editorMocks.capturedOptions = options;
    return editorMocks.fakeEditor;
  },
}));
vi.mock("@/app/(app)/write/journal-image-gallery-extension", () => ({
  JournalImageGallery: {},
}));
vi.mock("@/lib/entries/actions", () => actionMocks);

import { WriteEditor } from "@/app/(app)/write/write-editor";

const AUTHOR_ID = "11111111-1111-4111-8111-111111111111";
const ENTRY_DATE = "2026-06-15";
const UPDATED_CONTENT: JournalContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Fresh local words" }],
    },
  ],
};

function installMockLocalStorage() {
  const store = new Map<string, string>();

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: vi.fn(() => store.clear()),
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      removeItem: vi.fn((key: string) => store.delete(key)),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
    },
  });
}

function renderEditor({
  initialContent = EMPTY_JOURNAL_CONTENT,
  initialSource = "empty",
  initialUpdatedAt = null,
  published = null,
}: Partial<ComponentProps<typeof WriteEditor>> = {}) {
  return render(
    <WriteEditor
      authorId={AUTHOR_ID}
      entryDate={ENTRY_DATE}
      initialContent={initialContent}
      initialSource={initialSource}
      initialUpdatedAt={initialUpdatedAt}
      published={published}
    />,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  installMockLocalStorage();
  window.localStorage.clear();
  navigation.back.mockReset();
  editorMocks.capturedOptions = null;
  Object.values(editorMocks.chain).forEach((mock) => mock.mockReset());
  Object.assign(editorMocks.chain, {
    extendMarkRange: editorMocks.chain.extendMarkRange.mockReturnValue(
      editorMocks.chain,
    ),
    focus: editorMocks.chain.focus.mockReturnValue(editorMocks.chain),
    insertContent: editorMocks.chain.insertContent.mockReturnValue(
      editorMocks.chain,
    ),
    redo: editorMocks.chain.redo.mockReturnValue(editorMocks.chain),
    run: editorMocks.chain.run.mockReturnValue(true),
    setImage: editorMocks.chain.setImage.mockReturnValue(editorMocks.chain),
    setLink: editorMocks.chain.setLink.mockReturnValue(editorMocks.chain),
    undo: editorMocks.chain.undo.mockReturnValue(editorMocks.chain),
    unsetLink: editorMocks.chain.unsetLink.mockReturnValue(editorMocks.chain),
  });
  editorMocks.fakeEditor.can.mockReset();
  editorMocks.fakeEditor.can.mockReturnValue({
    redo: () => true,
    undo: () => true,
  });
  editorMocks.fakeEditor.chain.mockReset();
  editorMocks.fakeEditor.chain.mockReturnValue(editorMocks.chain);
  editorMocks.fakeEditor.commands.setContent.mockReset();
  editorMocks.fakeEditor.getAttributes.mockReset();
  editorMocks.fakeEditor.getAttributes.mockReturnValue({});
  editorMocks.fakeEditor.getJSON.mockReset();
  editorMocks.fakeEditor.getJSON.mockReturnValue(UPDATED_CONTENT);
  editorMocks.fakeEditor.isActive.mockReset();
  editorMocks.fakeEditor.isActive.mockReturnValue(false);
  actionMocks.publishJournalEntry.mockReset();
  actionMocks.publishJournalEntry.mockResolvedValue({
    ok: true,
    updatedAt: "2026-06-15T12:00:00.000Z",
  });
  actionMocks.saveJournalDraft.mockReset();
  actionMocks.saveJournalDraft.mockResolvedValue({
    ok: true,
    updatedAt: "2026-06-15T12:00:00.000Z",
  });
  actionMocks.uploadJournalImages.mockReset();
  actionMocks.uploadJournalImages.mockResolvedValue({
    images: [
      {
        alt: "first",
        bucket: "journal-images",
        height: null,
        id: "image-1",
        path: `${AUTHOR_ID}/drafts/${ENTRY_DATE}/image-1.webp`,
        previewUrl: "https://example.com/signed-image",
        width: null,
      },
    ],
    ok: true,
  });
  actionMocks.hydrateJournalContentImages.mockReset();
  actionMocks.hydrateJournalContentImages.mockResolvedValue({
    content: UPDATED_CONTENT,
    ok: true,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("WriteEditor", () => {
  it("starts from published content when no draft exists", () => {
    renderEditor({
      initialContent: UPDATED_CONTENT,
      initialSource: "published",
      initialUpdatedAt: "2026-06-15T10:00:00.000Z",
      published: {
        content: UPDATED_CONTENT,
        updatedAt: "2026-06-15T10:00:00.000Z",
      },
    });

    expect(screen.getByText("Published")).toBeTruthy();
    expect(editorMocks.capturedOptions?.content).toBe(UPDATED_CONTENT);
  });

  it("prefers a newer local draft during editor setup", async () => {
    const localStorageKey = `jots:write:v1:${AUTHOR_ID}:${ENTRY_DATE}`;
    window.localStorage.setItem(
      localStorageKey,
      JSON.stringify({
        content: UPDATED_CONTENT,
        updatedAt: "2026-06-15T12:00:00.000Z",
      }),
    );

    renderEditor({
      initialSource: "draft",
      initialUpdatedAt: "2026-06-15T10:00:00.000Z",
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(editorMocks.fakeEditor.commands.setContent).toHaveBeenCalledWith(
      UPDATED_CONTENT,
      { emitUpdate: false },
    );
    expect(screen.getByText("Local draft")).toBeTruthy();
  });

  it("rejects more than five images before upload", async () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(screen.getByLabelText("Images"), {
      target: {
        files: Array.from({ length: 6 }, (_, index) => {
          return new File(["image"], `image-${index}.png`, {
            type: "image/png",
          });
        }),
      },
    });

    expect(screen.getByRole("alert").textContent).toBe(
      "Upload 5 images or fewer.",
    );
    expect(actionMocks.uploadJournalImages).not.toHaveBeenCalled();
  });

  it("uploads selected images and inserts a gallery node", async () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(screen.getByLabelText("Images"), {
      target: {
        files: [
          new File(["image"], "first.webp", {
            type: "image/webp",
          }),
        ],
      },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Insert" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(actionMocks.uploadJournalImages).toHaveBeenCalledOnce();
    const formData = actionMocks.uploadJournalImages.mock.calls[0][0] as FormData;
    expect(formData.get("entryDate")).toBe(ENTRY_DATE);
    expect(formData.getAll("images")).toHaveLength(1);
    expect(editorMocks.chain.insertContent).toHaveBeenCalledWith({
      attrs: {
        images: [
          {
            alt: "first",
            bucket: "journal-images",
            height: null,
            id: "image-1",
            path: `${AUTHOR_ID}/drafts/${ENTRY_DATE}/image-1.webp`,
            previewUrl: "https://example.com/signed-image",
            width: null,
          },
        ],
      },
      type: "journalImageGallery",
    });
  });

  it("writes local drafts immediately and autosaves server drafts after a debounce", async () => {
    renderEditor();

    await act(async () => {
      editorMocks.capturedOptions?.onUpdate({
        editor: editorMocks.fakeEditor,
      });
    });

    expect(screen.getByText("Local draft")).toBeTruthy();
    expect(
      JSON.parse(
        window.localStorage.getItem(
          `jots:write:v1:${AUTHOR_ID}:${ENTRY_DATE}`,
        ) ?? "{}",
      ).content,
    ).toEqual(UPDATED_CONTENT);

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(actionMocks.saveJournalDraft).toHaveBeenCalledWith({
      content: UPDATED_CONTENT,
      entryDate: ENTRY_DATE,
    });
    expect(screen.getByText("Draft saved")).toBeTruthy();
  });

  it("publishes content, clears the local draft, and updates the button label", async () => {
    const localStorageKey = `jots:write:v1:${AUTHOR_ID}:${ENTRY_DATE}`;
    window.localStorage.setItem(
      localStorageKey,
      JSON.stringify({
        content: UPDATED_CONTENT,
        updatedAt: "2026-06-15T12:00:00.000Z",
      }),
    );
    renderEditor();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Publish" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(actionMocks.publishJournalEntry).toHaveBeenCalledWith({
      content: UPDATED_CONTENT,
      entryDate: ENTRY_DATE,
    });
    expect(window.localStorage.getItem(localStorageKey)).toBeNull();
    expect(screen.getByText("Published")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Update Entry" }),
    ).toBeTruthy();
  });
});
