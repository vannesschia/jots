import type { JSONContent } from "@tiptap/core";

export const JOURNAL_IMAGE_BUCKET = "journal-images";
export const JOURNAL_IMAGE_MAX_FILES = 5;
export const JOURNAL_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
export const JOURNAL_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const JOURNAL_IMAGE_CONVERTIBLE_MIME_TYPES = [
  "image/heic",
  "image/heif",
] as const;
export const JOURNAL_IMAGE_INPUT_MIME_TYPES = [
  ...JOURNAL_IMAGE_MIME_TYPES,
  ...JOURNAL_IMAGE_CONVERTIBLE_MIME_TYPES,
] as const;

export type JournalImageMimeType = (typeof JOURNAL_IMAGE_MIME_TYPES)[number];
export type JournalImageInputMimeType =
  (typeof JOURNAL_IMAGE_INPUT_MIME_TYPES)[number];

export type JournalImageRef = {
  alt: string | null;
  bucket: typeof JOURNAL_IMAGE_BUCKET;
  height: number | null;
  id: string;
  path: string;
  previewUrl?: string;
  width: number | null;
};

export type JournalContent = JSONContent & {
  type: "doc";
};

type NormalizeJournalContentOptions = {
  preserveTransientImageUrls?: boolean;
};

export const EMPTY_JOURNAL_CONTENT: JournalContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
    },
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNullableDimension(value: unknown) {
  return value === null || value === undefined || isPositiveInteger(value);
}

function isValidPreviewUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return (
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("blob:")
  );
}

function isValidJournalImagePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-fA-F-]{36}\/(drafts|published)\/\d{4}-\d{2}-\d{2}\/[a-zA-Z0-9_-]+\.(jpe?g|png|webp)$/.test(
      value,
    )
  );
}

function normalizeJournalImageRef(
  value: unknown,
  options: NormalizeJournalContentOptions,
): JournalImageRef | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.bucket !== JOURNAL_IMAGE_BUCKET ||
    typeof value.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(value.id) ||
    !isValidJournalImagePath(value.path) ||
    (value.alt !== null && value.alt !== undefined && typeof value.alt !== "string") ||
    !isNullableDimension(value.width) ||
    !isNullableDimension(value.height)
  ) {
    return null;
  }

  const { alt, height, id, path, previewUrl, width } = value;

  const normalized: JournalImageRef = {
    alt: typeof alt === "string" ? alt.slice(0, 200) : null,
    bucket: JOURNAL_IMAGE_BUCKET,
    height: isPositiveInteger(height) ? height : null,
    id,
    path,
    width: isPositiveInteger(width) ? width : null,
  };

  if (options.preserveTransientImageUrls && isValidPreviewUrl(previewUrl)) {
    normalized.previewUrl = previewUrl;
  }

  return normalized;
}

function normalizeJournalImageGalleryAttrs(
  attrs: unknown,
  options: NormalizeJournalContentOptions,
) {
  if (!isRecord(attrs) || !Array.isArray(attrs.images)) {
    return null;
  }

  if (
    attrs.images.length < 1 ||
    attrs.images.length > JOURNAL_IMAGE_MAX_FILES
  ) {
    return null;
  }

  const images = attrs.images.map((image) =>
    normalizeJournalImageRef(image, options),
  );

  if (images.some((image) => !image)) {
    return null;
  }

  return {
    images: images as JournalImageRef[],
  };
}

function normalizeJsonValue(
  value: unknown,
  options: NormalizeJournalContentOptions,
): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonValue(entry, options));
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const normalized: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value)) {
    const normalizedEntry = normalizeJsonValue(entry, options);

    if (normalizedEntry !== undefined) {
      normalized[key] = normalizedEntry;
    }
  }

  if (normalized.type === "journalImageGallery") {
    const attrs = normalizeJournalImageGalleryAttrs(
      normalized.attrs,
      options,
    );

    if (!attrs) {
      return undefined;
    }

    normalized.attrs = attrs;
  }

  return normalized;
}

function isJsonValue(value: unknown): value is JSONContent {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isRecord(value)) {
    return Object.values(value).every(
      (entry) => entry === undefined || isJsonValue(entry),
    );
  }

  return false;
}

export function isJournalContent(value: unknown): value is JournalContent {
  return isRecord(value) && value.type === "doc" && isJsonValue(value);
}

export function getJournalContentValidationError(value: unknown) {
  if (!isRecord(value)) {
    return `root is ${value === null ? "null" : typeof value}`;
  }

  if (value.type !== "doc") {
    return `root type is ${String(value.type)}`;
  }

  if (!isJsonValue(value)) {
    return "content contains a non-JSON value";
  }

  if (!normalizeJournalContent(value)) {
    return "image galleries must contain 1 to 5 durable journal image references";
  }

  return null;
}

export function normalizeJournalContent(
  value: unknown,
  options: NormalizeJournalContentOptions = {},
): JournalContent | null {
  if (!isRecord(value) || value.type !== "doc") {
    return null;
  }

  try {
    const json = JSON.parse(JSON.stringify(value)) as unknown;
    const normalized = normalizeJsonValue(json, options);

    return isJournalContent(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function getJournalContent(value: unknown): JournalContent {
  return normalizeJournalContent(value) ?? EMPTY_JOURNAL_CONTENT;
}
