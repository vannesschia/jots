"use client";

import type { Editor } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import SubscriptExtension from "@tiptap/extension-subscript";
import SuperscriptExtension from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions/placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronLeft,
  Code2,
  Highlighter,
  ImagePlus,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ComponentType,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  hydrateJournalContentImages,
  publishJournalEntry,
  saveJournalDraft,
  uploadJournalImages,
} from "@/lib/entries/actions";
import {
  JOURNAL_IMAGE_MAX_FILES,
  JOURNAL_IMAGE_MAX_SIZE,
  JOURNAL_IMAGE_MIME_TYPES,
  normalizeJournalContent,
  type JournalContent,
  type JournalImageRef,
} from "@/lib/entries/content";
import { formatFullDate } from "@/lib/entries/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JournalImageGallery } from "./journal-image-gallery-extension";

type SaveStatus =
  | "Saved"
  | "Local draft"
  | "Saving"
  | "Draft saved"
  | "Offline draft"
  | "Save failed"
  | "Published";

type LocalJournalDraft = {
  content: JournalContent;
  updatedAt: string;
};

type WriteEditorProps = {
  authorId: string;
  entryDate: string;
  initialContent: JournalContent;
  initialSource: "draft" | "published" | "empty";
  initialUpdatedAt: string | null;
  published: {
    content: JournalContent;
    updatedAt: string;
  } | null;
};

const AUTOSAVE_DELAY_MS = 1000;
const HIGHLIGHT_COLOR = "#fef08a";
const JOURNAL_IMAGE_ACCEPT = JOURNAL_IMAGE_MIME_TYPES.join(",");

function getInitialStatus(source: WriteEditorProps["initialSource"]) {
  if (source === "draft") {
    return "Draft saved";
  }

  if (source === "published") {
    return "Published";
  }

  return "Saved";
}

function getBadgeVariant(status: SaveStatus) {
  if (status === "Save failed") {
    return "destructive";
  }

  if (status === "Saving" || status === "Local draft") {
    return "secondary";
  }

  return "outline";
}

function isNewerDate(left: string, right: string | null) {
  return !right || new Date(left).getTime() > new Date(right).getTime();
}

function parseLocalDraft(value: string | null): LocalJournalDraft | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<LocalJournalDraft>;

    const content = normalizeJournalContent(parsed.content, {
      preserveTransientImageUrls: true,
    });

    if (typeof parsed.updatedAt === "string" && content) {
      return {
        content,
        updatedAt: parsed.updatedAt,
      };
    }
  } catch {
    return null;
  }

  return null;
}

type ToolbarButtonProps = {
  active?: boolean;
  disabled?: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
};

function ToolbarButton({
  active = false,
  disabled = false,
  icon: Icon,
  label,
  onClick,
}: ToolbarButtonProps) {
  return (
    <Button
      aria-label={label}
      aria-pressed={active || undefined}
      className={cn(
        "size-8 text-muted-foreground hover:text-foreground",
        active && "bg-muted text-foreground",
      )}
      disabled={disabled}
      onClick={onClick}
      size="icon"
      title={label}
      type="button"
      variant="ghost"
    >
      <Icon className="size-4" />
    </Button>
  );
}

function ToolbarDivider() {
  return <span aria-hidden="true" className="h-8 w-px bg-border" />;
}

function getBlockStyle(editor: Editor) {
  if (editor.isActive("heading", { level: 1 })) {
    return "heading-1";
  }

  if (editor.isActive("heading", { level: 2 })) {
    return "heading-2";
  }

  if (editor.isActive("heading", { level: 3 })) {
    return "heading-3";
  }

  return "paragraph";
}

function getImageFileValidationError(files: File[]) {
  if (files.length === 0) {
    return "Choose at least one image.";
  }

  if (files.length > JOURNAL_IMAGE_MAX_FILES) {
    return `Upload ${JOURNAL_IMAGE_MAX_FILES} images or fewer.`;
  }

  if (
    files.some(
      (file) =>
        !JOURNAL_IMAGE_MIME_TYPES.includes(
          file.type as (typeof JOURNAL_IMAGE_MIME_TYPES)[number],
        ),
    )
  ) {
    return "Upload JPEG, PNG, or WebP images.";
  }

  if (files.some((file) => file.size > JOURNAL_IMAGE_MAX_SIZE)) {
    return "Each image must be 5 MB or smaller.";
  }

  return null;
}

function WriteEditorToolbar({
  editor,
  entryDate,
}: {
  editor: Editor | null;
  entryDate: string;
}) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  if (!editor) {
    return null;
  }

  const activeEditor = editor;

  function setLink() {
    const previousUrl = activeEditor.getAttributes("link").href as
      | string
      | undefined;
    const url = window.prompt("Link URL", previousUrl ?? "");

    if (url === null) {
      return;
    }

    if (!url.trim()) {
      activeEditor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    activeEditor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }

  function resetImageDialog() {
    setImageError(null);
    setImageFiles([]);
    setIsUploadingImages(false);
  }

  function updateImageFiles(files: FileList | null) {
    const nextFiles = Array.from(files ?? []);

    setImageFiles(nextFiles);
    setImageError(getImageFileValidationError(nextFiles));
  }

  async function submitImageUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = getImageFileValidationError(imageFiles);

    if (validationError) {
      setImageError(validationError);
      return;
    }

    setIsUploadingImages(true);
    setImageError(null);

    const formData = new FormData();
    formData.set("entryDate", entryDate);
    imageFiles.forEach((file) => formData.append("images", file));

    const result = await uploadJournalImages(formData);

    setIsUploadingImages(false);

    if (!result.ok) {
      setImageError(result.error);
      return;
    }

    activeEditor
      .chain()
      .focus()
      .insertContent({
        attrs: {
          images: result.images satisfies JournalImageRef[],
        },
        type: "journalImageGallery",
      })
      .run();
    setImageDialogOpen(false);
    resetImageDialog();
  }

  return (
    <div
      aria-label="Editor toolbar"
      className="mt-4 flex w-full items-center gap-1 rounded-lg border bg-background/80 p-1 overflow-x-auto scrollbar-none"
      role="toolbar"
    >
      <ToolbarButton
        disabled={!editor.can().undo()}
        icon={Undo2}
        label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
      />
      <ToolbarButton
        disabled={!editor.can().redo()}
        icon={Redo2}
        label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
      />
      <ToolbarDivider />
      <label className="sr-only" htmlFor="write-editor-block-style">
        Block style
      </label>
      <select
        className="h-8 rounded-md bg-transparent px-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        id="write-editor-block-style"
        onChange={(event) => {
          const value = event.target.value;

          if (value === "heading-1") {
            editor.chain().focus().toggleHeading({ level: 1 }).run();
            return;
          }

          if (value === "heading-2") {
            editor.chain().focus().toggleHeading({ level: 2 }).run();
            return;
          }

          if (value === "heading-3") {
            editor.chain().focus().toggleHeading({ level: 3 }).run();
            return;
          }

          editor.chain().focus().setParagraph().run();
        }}
        title="Block style"
        value={getBlockStyle(editor)}
      >
        <option value="paragraph">Paragraph</option>
        <option value="heading-1">Heading 1</option>
        <option value="heading-2">Heading 2</option>
        <option value="heading-3">Heading 3</option>
      </select>
      <ToolbarButton
        active={editor.isActive("bulletList")}
        icon={List}
        label="Bullet list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        active={editor.isActive("orderedList")}
        icon={ListOrdered}
        label="Numbered list"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        active={editor.isActive("blockquote")}
        icon={Quote}
        label="Quote"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarDivider />
      <ToolbarButton
        active={editor.isActive("bold")}
        icon={Bold}
        label="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        active={editor.isActive("italic")}
        icon={Italic}
        label="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        active={editor.isActive("strike")}
        icon={Strikethrough}
        label="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <ToolbarButton
        active={editor.isActive("code")}
        icon={Code2}
        label="Inline code"
        onClick={() => editor.chain().focus().toggleCode().run()}
      />
      <ToolbarButton
        active={editor.isActive("underline")}
        icon={Underline}
        label="Underline"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        active={editor.isActive("highlight")}
        icon={Highlighter}
        label="Highlight"
        onClick={() =>
          editor
            .chain()
            .focus()
            .toggleHighlight({ color: HIGHLIGHT_COLOR })
            .run()
        }
      />
      <ToolbarButton
        active={editor.isActive("link")}
        icon={Link}
        label="Link"
        onClick={setLink}
      />
      <ToolbarDivider />
      <ToolbarButton
        active={editor.isActive("superscript")}
        icon={Superscript}
        label="Superscript"
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
      />
      <ToolbarButton
        active={editor.isActive("subscript")}
        icon={Subscript}
        label="Subscript"
        onClick={() => editor.chain().focus().toggleSubscript().run()}
      />
      <ToolbarDivider />
      {(["left", "center", "right", "justify"] as const).map((alignment) => {
        const icons = {
          center: AlignCenter,
          justify: AlignJustify,
          left: AlignLeft,
          right: AlignRight,
        };
        const labels = {
          center: "Align center",
          justify: "Justify",
          left: "Align left",
          right: "Align right",
        };

        return (
          <ToolbarButton
            active={editor.isActive({ textAlign: alignment })}
            icon={icons[alignment]}
            key={alignment}
            label={labels[alignment]}
            onClick={() => editor.chain().focus().setTextAlign(alignment).run()}
          />
        );
      })}
      <ToolbarDivider />
      <Dialog
        onOpenChange={(open) => {
          setImageDialogOpen(open);

          if (!open) {
            resetImageDialog();
          }
        }}
        open={imageDialogOpen}
      >
        <Button
          className="h-8 gap-2 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => setImageDialogOpen(true)}
          title="Add images"
          type="button"
          variant="ghost"
        >
          <ImagePlus className="size-4" />
          <span>Add</span>
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add images</DialogTitle>
            <DialogDescription>
              You may upload up to 5 images.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitImageUpload}>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="journal-images">
                Images
              </label>
              <Input
                accept={JOURNAL_IMAGE_ACCEPT}
                id="journal-images"
                multiple
                onChange={(event) => updateImageFiles(event.target.files)}
                type="file"
              />
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, or WebP. 5 MB each.
              </p>
              {imageError ? (
                <p className="text-sm text-destructive" role="alert">
                  {imageError}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                disabled={isUploadingImages}
                onClick={() => setImageDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={isUploadingImages || imageFiles.length === 0}
                type="submit"
              >
                {isUploadingImages ? "Uploading..." : "Insert"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function WriteEditor({
  authorId,
  entryDate,
  initialContent,
  initialSource,
  initialUpdatedAt,
  published,
}: WriteEditorProps) {
  const router = useRouter();
  const localStorageKey = `jots:write:v1:${authorId}:${entryDate}`;
  const [status, setStatus] = useState<SaveStatus>(
    getInitialStatus(initialSource),
  );
  const [hasPublishedEntry, setHasPublishedEntry] = useState(Boolean(published));
  const [isPublishing, setIsPublishing] = useState(false);
  const [, setToolbarRevision] = useState(0);
  const contentRef = useRef<JournalContent>(initialContent);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRequestRef = useRef(0);
  const localDraftRequestRef = useRef(0);
  const loadedLocalDraftRef = useRef(false);
  const formattedDate = useMemo(() => formatFullDate(entryDate), [entryDate]);

  const clearPendingServerSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  const saveLocalDraft = useCallback(
    (content: JournalContent) => {
      const updatedAt = new Date().toISOString();

      try {
        window.localStorage.setItem(
          localStorageKey,
          JSON.stringify({
            content,
            updatedAt,
          } satisfies LocalJournalDraft),
        );
        setStatus(
          typeof navigator !== "undefined" && navigator.onLine === false
            ? "Offline draft"
            : "Local draft",
        );
      } catch {
        setStatus("Save failed");
      }
    },
    [localStorageKey],
  );

  const saveServerDraft = useCallback(
    async (content: JournalContent) => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setStatus("Offline draft");
        return;
      }

      const requestId = saveRequestRef.current + 1;
      saveRequestRef.current = requestId;
      setStatus("Saving");

      try {
        const result = await saveJournalDraft({
          content,
          entryDate,
        });

        if (saveRequestRef.current !== requestId) {
          return;
        }

        if (!result.ok) {
          console.error("Journal draft autosave failed", result.error);
          setStatus("Save failed");
          return;
        }

        setStatus("Draft saved");
      } catch {
        console.error("Journal draft autosave threw an unexpected error");
        setStatus(
          typeof navigator !== "undefined" && navigator.onLine === false
            ? "Offline draft"
            : "Save failed",
        );
      }
    },
    [entryDate],
  );

  const queueServerDraftSave = useCallback(
    (content: JournalContent) => {
      clearPendingServerSave();

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setStatus("Offline draft");
        return;
      }

      saveTimeoutRef.current = setTimeout(() => {
        void saveServerDraft(content);
      }, AUTOSAVE_DELAY_MS);
    },
    [clearPendingServerSave, saveServerDraft],
  );

  const editor = useEditor({
    content: initialContent,
    editorProps: {
      attributes: {
        "aria-label": "Journal entry editor",
        class:
          "min-h-[60vh] w-full px-1 py-8 text-lg leading-8 outline-none sm:text-xl [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-muted-foreground [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_h1]:text-4xl [&_h1]:font-semibold [&_h2]:text-3xl [&_h2]:font-semibold [&_h3]:text-2xl [&_h3]:font-semibold [&_img]:my-6 [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:pl-7 [&_ul]:list-disc [&_ul]:pl-7",
      },
    },
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Image,
      JournalImageGallery,
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      SubscriptExtension,
      SuperscriptExtension,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    immediatelyRender: false,
    onSelectionUpdate() {
      setToolbarRevision((current) => current + 1);
    },
    onUpdate({ editor: currentEditor }) {
      setToolbarRevision((current) => current + 1);
      const rawContent = currentEditor.getJSON();
      const localContent = normalizeJournalContent(rawContent, {
        preserveTransientImageUrls: true,
      });
      const serverContent = normalizeJournalContent(rawContent);

      if (!localContent || !serverContent) {
        console.error("Journal draft content failed validation", rawContent);
        setStatus("Save failed");
        return;
      }

      contentRef.current = serverContent;
      saveLocalDraft(localContent);
      queueServerDraftSave(serverContent);
    },
  });

  useEffect(() => {
    return () => {
      clearPendingServerSave();
    };
  }, [clearPendingServerSave]);

  useEffect(() => {
    if (!editor || loadedLocalDraftRef.current) {
      return;
    }

    loadedLocalDraftRef.current = true;
    const localDraft = parseLocalDraft(
      window.localStorage.getItem(localStorageKey),
    );

    if (!localDraft || !isNewerDate(localDraft.updatedAt, initialUpdatedAt)) {
      return;
    }

    const activeEditor = editor;
    const activeLocalDraft = localDraft;
    const requestId = localDraftRequestRef.current + 1;
    localDraftRequestRef.current = requestId;
    let cancelled = false;

    async function loadLocalDraft() {
      const result = await hydrateJournalContentImages({
        content: activeLocalDraft.content,
        entryDate,
      });
      const content = result.ok ? result.content : activeLocalDraft.content;
      const serverContent = normalizeJournalContent(content);

      if (
        cancelled ||
        localDraftRequestRef.current !== requestId ||
        !window.localStorage.getItem(localStorageKey)
      ) {
        return;
      }

      contentRef.current = serverContent ?? activeLocalDraft.content;
      activeEditor.commands.setContent(content, { emitUpdate: false });
      queueMicrotask(() => setStatus("Local draft"));
    }

    void loadLocalDraft();

    return () => {
      cancelled = true;
    };
  }, [editor, entryDate, initialUpdatedAt, localStorageKey]);

  useEffect(() => {
    function saveCurrentDraftWhenOnline() {
      if (
        status === "Offline draft" ||
        status === "Local draft" ||
        status === "Save failed"
      ) {
        queueServerDraftSave(contentRef.current);
      }
    }

    window.addEventListener("online", saveCurrentDraftWhenOnline);

    return () => {
      window.removeEventListener("online", saveCurrentDraftWhenOnline);
    };
  }, [queueServerDraftSave, status]);

  async function publishEntry() {
    if (!editor || isPublishing) {
      return;
    }

    clearPendingServerSave();
    localDraftRequestRef.current += 1;
    setIsPublishing(true);
    const rawContent = editor.getJSON();
    const content = normalizeJournalContent(rawContent);

    if (!content) {
      console.error("Published journal content failed validation", rawContent);
      setStatus("Save failed");
      setIsPublishing(false);
      return;
    }

    contentRef.current = content;
    setStatus("Saving");

    try {
      const result = await publishJournalEntry({
        content,
        entryDate,
      });

      if (!result.ok) {
        console.error("Publishing journal entry failed", result.error);
        setStatus("Save failed");
        return;
      }

      window.localStorage.removeItem(localStorageKey);
      setHasPublishedEntry(true);
      setStatus("Published");
    } catch {
      console.error("Publishing journal entry threw an unexpected error");
      setStatus("Save failed");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <section className="min-h-full w-full bg-surface p-4 sm:p-6">
      <div className="mx-auto flex w-full items-center gap-2">
        <Button
          aria-label="Back"
          className="flex size-8 items-center justify-center"
          onClick={() => router.back()}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Badge variant={getBadgeVariant(status)}>{status}</Badge>
        <Button
          className="ml-auto"
          disabled={!editor || isPublishing}
          onClick={publishEntry}
          type="button"
          variant="secondary"
        >
          {hasPublishedEntry ? "Update published entry" : "Publish"}
        </Button>
      </div>
      <section className="mx-auto w-full max-w-5xl">
        <h1 className="mt-8 font-serif text-3xl font-medium italic tracking-tight sm:text-4xl">
          {formattedDate}
        </h1>
        <WriteEditorToolbar editor={editor} entryDate={entryDate} />
        <EditorContent
          className="mt-3 rounded-lg border border-transparent bg-background/40 px-4 focus-within:border-border sm:px-6"
          editor={editor}
        />
        {!editor ? (
          <div className="px-4 py-8 text-muted-foreground">
            Loading editor...
          </div>
        ) : null}
      </section>
    </section>
  );
}
