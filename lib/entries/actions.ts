"use server";

import { revalidatePath } from "next/cache";

import { isValidLocalDate } from "@/lib/entries/dates";
import {
  JOURNAL_IMAGE_BUCKET,
  JOURNAL_IMAGE_MAX_FILES,
  JOURNAL_IMAGE_MAX_SIZE,
  JOURNAL_IMAGE_MIME_TYPES,
  getJournalContentValidationError,
  normalizeJournalContent,
  type JournalContent,
  type JournalImageMimeType,
} from "@/lib/entries/content";
import {
  collectJournalImagePaths,
  getJournalImagePathScope,
  hydrateJournalImagePreviews,
  rewriteJournalImagePaths,
} from "@/lib/entries/image-urls";
import { requireProfile } from "@/lib/profile/dal";
import { createClient } from "@/lib/supabase/server";

const JOURNAL_IMAGE_EXTENSIONS: Record<JournalImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const JOURNAL_IMAGE_SIGNED_URL_SECONDS = 60 * 60;

export type JournalMutationState =
  | {
      error: string;
      ok: false;
    }
  | {
      ok: true;
      updatedAt: string;
    };

export type JournalImageUploadState =
  | {
      error: string;
      ok: false;
    }
  | {
      images: Array<{
        alt: string | null;
        bucket: typeof JOURNAL_IMAGE_BUCKET;
        height: null;
        id: string;
        path: string;
        previewUrl?: string;
        width: null;
      }>;
      ok: true;
    };

type UploadedJournalImage = Extract<
  JournalImageUploadState,
  { ok: true }
>["images"][number];

type JournalMutationInput = {
  content: unknown;
  entryDate: string;
};

function validateJournalMutationInput({
  content,
  entryDate,
}: JournalMutationInput):
  | { content: JournalContent; entryDate: string; ok: true }
  | { error: string; ok: false } {
  if (!isValidLocalDate(entryDate)) {
    return { error: "Choose a valid journal date.", ok: false };
  }

  const normalizedContent = normalizeJournalContent(content);

  if (!normalizedContent) {
    const reason = getJournalContentValidationError(content);

    return {
      error: `Journal content is not in a format we can save${
        reason ? `: ${reason}` : ""
      }.`,
      ok: false,
    };
  }

  return { content: normalizedContent, entryDate, ok: true };
}

function isJournalImageMimeType(value: string): value is JournalImageMimeType {
  return JOURNAL_IMAGE_MIME_TYPES.includes(value as JournalImageMimeType);
}

function isFileLike(value: FormDataEntryValue): value is File {
  return typeof value === "object" && "arrayBuffer" in value && "size" in value;
}

function getJournalImageUploadValidationError(files: File[]) {
  if (files.length === 0) {
    return "Choose at least one image.";
  }

  if (files.length > JOURNAL_IMAGE_MAX_FILES) {
    return `Upload ${JOURNAL_IMAGE_MAX_FILES} images or fewer.`;
  }

  if (files.some((file) => !isJournalImageMimeType(file.type))) {
    return "Upload JPEG, PNG, or WebP images.";
  }

  if (files.some((file) => file.size > JOURNAL_IMAGE_MAX_SIZE)) {
    return "Each image must be 5 MB or smaller.";
  }

  return null;
}

function getFileBaseName(file: File) {
  return file.name.replace(/\.[^.]+$/, "").trim().slice(0, 80);
}

async function getSignedJournalImageUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
) {
  if (paths.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.storage
    .from(JOURNAL_IMAGE_BUCKET)
    .createSignedUrls(paths, JOURNAL_IMAGE_SIGNED_URL_SECONDS);

  if (error) {
    throw new Error(`Unable to hydrate journal images: ${error.message}`);
  }

  const signedUrls = new Map<string, string>();

  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) {
      signedUrls.set(entry.path, entry.signedUrl);
    }
  }

  return signedUrls;
}

function validateJournalImageOwnership(
  content: JournalContent,
  authorId: string,
  entryDate: string,
) {
  const invalidPath = collectJournalImagePaths(content).find((path) => {
    const scope = getJournalImagePathScope(path);

    return (
      !scope ||
      scope.authorId !== authorId ||
      scope.entryDate !== entryDate ||
      (scope.state !== "drafts" && scope.state !== "published")
    );
  });

  return invalidPath
    ? "Journal images must belong to this journal date."
    : null;
}

async function copyDraftImagesForPublishing({
  authorId,
  content,
  entryDate,
  supabase,
}: {
  authorId: string;
  content: JournalContent;
  entryDate: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const copiedPaths: string[] = [];
  const rewritePaths = new Map<string, string>();
  const draftPrefix = `${authorId}/drafts/${entryDate}/`;

  for (const path of collectJournalImagePaths(content)) {
    const scope = getJournalImagePathScope(path);

    if (
      !scope ||
      scope.authorId !== authorId ||
      scope.entryDate !== entryDate
    ) {
      return {
        error: "Journal images must belong to this journal date.",
        ok: false,
      } as const;
    }

    if (scope.state === "published") {
      rewritePaths.set(path, path);
      continue;
    }

    if (!path.startsWith(draftPrefix)) {
      return {
        error: "Journal images must belong to this journal date.",
        ok: false,
      } as const;
    }

    const extension = path.split(".").at(-1) ?? "webp";
    const publishedPath = `${authorId}/published/${entryDate}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from(JOURNAL_IMAGE_BUCKET)
      .copy(path, publishedPath);

    if (error) {
      await supabase.storage.from(JOURNAL_IMAGE_BUCKET).remove(copiedPaths);

      return {
        error: "We could not publish one of these images.",
        ok: false,
      } as const;
    }

    copiedPaths.push(publishedPath);
    rewritePaths.set(path, publishedPath);
  }

  const publishedContent = rewriteJournalImagePaths(
    content,
    (image) => rewritePaths.get(image.path) ?? image.path,
  );

  if (!publishedContent) {
    await supabase.storage.from(JOURNAL_IMAGE_BUCKET).remove(copiedPaths);

    return {
      error: "Journal content is not in a format we can publish.",
      ok: false,
    } as const;
  }

  return {
    copiedPaths,
    content: publishedContent,
    ok: true,
  } as const;
}

export async function saveJournalDraft(
  input: JournalMutationInput,
): Promise<JournalMutationState> {
  const validated = validateJournalMutationInput(input);

  if (!validated.ok) {
    return {
      error: validated.error,
      ok: false,
    };
  }

  const profile = await requireProfile();
  const supabase = await createClient();
  const imageOwnershipError = validateJournalImageOwnership(
    validated.content,
    profile.id,
    validated.entryDate,
  );

  if (imageOwnershipError) {
    return {
      error: imageOwnershipError,
      ok: false,
    };
  }

  const savedAt = new Date().toISOString();
  const { error } = await supabase.from("journal_entry_drafts").upsert(
    {
      author_id: profile.id,
      content: validated.content,
      entry_date: validated.entryDate,
      entry_timezone: profile.preferred_timezone,
      updated_at: savedAt,
    },
    {
      onConflict: "author_id,entry_date",
    },
  );

  if (error) {
    console.error("Unable to autosave journal draft", error);

    return {
      error: "We could not autosave this draft.",
      ok: false,
    };
  }

  return {
    ok: true,
    updatedAt: savedAt,
  };
}

export async function uploadJournalImages(
  formData: FormData,
): Promise<JournalImageUploadState> {
  const entryDate = formData.get("entryDate");

  if (typeof entryDate !== "string" || !isValidLocalDate(entryDate)) {
    return {
      error: "Choose a valid journal date.",
      ok: false,
    };
  }

  const files = formData.getAll("images").filter(isFileLike);
  const validationError = getJournalImageUploadValidationError(files);

  if (validationError) {
    return {
      error: validationError,
      ok: false,
    };
  }

  const profile = await requireProfile();
  const supabase = await createClient();
  const uploadedPaths: string[] = [];
  const images: UploadedJournalImage[] = [];

  for (const file of files) {
    const id = crypto.randomUUID();
    const extension = JOURNAL_IMAGE_EXTENSIONS[file.type as JournalImageMimeType];
    const path = `${profile.id}/drafts/${entryDate}/${id}.${extension}`;
    const { error } = await supabase.storage
      .from(JOURNAL_IMAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      await supabase.storage.from(JOURNAL_IMAGE_BUCKET).remove(uploadedPaths);

      return {
        error: "We could not upload these images.",
        ok: false,
      };
    }

    uploadedPaths.push(path);
    images.push({
      alt: getFileBaseName(file) || null,
      bucket: JOURNAL_IMAGE_BUCKET,
      height: null,
      id,
      path,
      width: null,
    });
  }

  try {
    const signedUrls = await getSignedJournalImageUrls(supabase, uploadedPaths);

    return {
      images: images.map((image) => ({
        ...image,
        previewUrl: signedUrls.get(image.path),
      })),
      ok: true,
    };
  } catch (error) {
    console.error(error);
    await supabase.storage.from(JOURNAL_IMAGE_BUCKET).remove(uploadedPaths);

    return {
      error: "We could not prepare these image previews.",
      ok: false,
    };
  }
}

export async function hydrateJournalContentImages(
  input: JournalMutationInput,
): Promise<
  | {
      content: JournalContent;
      ok: true;
    }
  | {
      error: string;
      ok: false;
    }
> {
  const validated = validateJournalMutationInput(input);

  if (!validated.ok) {
    return {
      error: validated.error,
      ok: false,
    };
  }

  const profile = await requireProfile();
  const imageOwnershipError = validateJournalImageOwnership(
    validated.content,
    profile.id,
    validated.entryDate,
  );

  if (imageOwnershipError) {
    return {
      error: imageOwnershipError,
      ok: false,
    };
  }

  try {
    const supabase = await createClient();
    const content = await hydrateJournalImagePreviews(
      validated.content,
      (paths) => getSignedJournalImageUrls(supabase, paths),
    );

    return {
      content,
      ok: true,
    };
  } catch (error) {
    console.error(error);

    return {
      error: "We could not prepare these image previews.",
      ok: false,
    };
  }
}

export async function publishJournalEntry(
  input: JournalMutationInput,
): Promise<JournalMutationState> {
  const validated = validateJournalMutationInput(input);

  if (!validated.ok) {
    return {
      error: validated.error,
      ok: false,
    };
  }

  const profile = await requireProfile();
  const supabase = await createClient();
  const publishImagesResult = await copyDraftImagesForPublishing({
    authorId: profile.id,
    content: validated.content,
    entryDate: validated.entryDate,
    supabase,
  });

  if (!publishImagesResult.ok) {
    return {
      error: publishImagesResult.error,
      ok: false,
    };
  }

  const publishedAt = new Date().toISOString();
  const { error } = await supabase.from("journal_entries").upsert(
    {
      author_id: profile.id,
      content: publishImagesResult.content,
      entry_date: validated.entryDate,
      entry_timezone: profile.preferred_timezone,
      updated_at: publishedAt,
    },
    {
      onConflict: "author_id,entry_date",
    },
  );

  if (error) {
    console.error("Unable to publish journal entry", error);
    await supabase.storage
      .from(JOURNAL_IMAGE_BUCKET)
      .remove(publishImagesResult.copiedPaths);

    return {
      error: "We could not publish this entry.",
      ok: false,
    };
  }

  const { error: draftError } = await supabase
    .from("journal_entry_drafts")
    .delete()
    .eq("author_id", profile.id)
    .eq("entry_date", validated.entryDate);

  if (draftError) {
    console.error("Unable to clear journal draft after publish", draftError);

    return {
      error: "The entry was published, but we could not clear the draft.",
      ok: false,
    };
  }

  const draftImagePaths = collectJournalImagePaths(validated.content).filter(
    (path) => path.includes(`/${"drafts"}/${validated.entryDate}/`),
  );
  await supabase.storage.from(JOURNAL_IMAGE_BUCKET).remove(draftImagePaths);

  revalidatePath("/jots");
  revalidatePath("/entries");
  revalidatePath(`/write/${validated.entryDate}`);

  return {
    ok: true,
    updatedAt: publishedAt,
  };
}
