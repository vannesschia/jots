import {
  JOURNAL_IMAGE_BUCKET,
  normalizeJournalContent,
  type JournalContent,
  type JournalImageRef,
} from "@/lib/entries/content";

export type ImagePreviewResolver = (
  paths: string[],
) => Promise<Map<string, string>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getGalleryImages(node: unknown): JournalImageRef[] | null {
  if (
    !isRecord(node) ||
    node.type !== "journalImageGallery" ||
    !isRecord(node.attrs) ||
    !Array.isArray(node.attrs.images)
  ) {
    return null;
  }

  return node.attrs.images as JournalImageRef[];
}

function walkContentNode(value: unknown, visit: (node: Record<string, unknown>) => void) {
  if (Array.isArray(value)) {
    value.forEach((entry) => walkContentNode(entry, visit));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  visit(value);

  if (Array.isArray(value.content)) {
    value.content.forEach((entry) => walkContentNode(entry, visit));
  }
}

function mapContentNode(
  value: unknown,
  map: (node: Record<string, unknown>) => Record<string, unknown>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => mapContentNode(entry, map));
  }

  if (!isRecord(value)) {
    return value;
  }

  const mapped = map(value);

  if (Array.isArray(mapped.content)) {
    return {
      ...mapped,
      content: mapped.content.map((entry) => mapContentNode(entry, map)),
    };
  }

  return mapped;
}

export function collectJournalImagePaths(content: JournalContent) {
  const paths = new Set<string>();

  walkContentNode(content, (node) => {
    const images = getGalleryImages(node);

    if (!images) {
      return;
    }

    images.forEach((image) => paths.add(image.path));
  });

  return [...paths];
}

export async function hydrateJournalImagePreviews(
  content: JournalContent,
  resolvePreviews: ImagePreviewResolver,
) {
  const paths = collectJournalImagePaths(content);

  if (paths.length === 0) {
    return content;
  }

  const previewUrls = await resolvePreviews(paths);
  const hydrated = mapContentNode(content, (node) => {
    const images = getGalleryImages(node);

    if (!images) {
      return node;
    }

    return {
      ...node,
      attrs: {
        images: images.map((image) => ({
          ...image,
          previewUrl: previewUrls.get(image.path) ?? image.previewUrl,
        })),
      },
    };
  });

  return (
    normalizeJournalContent(hydrated, {
      preserveTransientImageUrls: true,
    }) ?? content
  );
}

export function rewriteJournalImagePaths(
  content: JournalContent,
  rewritePath: (image: JournalImageRef) => string,
) {
  const rewritten = mapContentNode(content, (node) => {
    const images = getGalleryImages(node);

    if (!images) {
      return node;
    }

    return {
      ...node,
      attrs: {
        images: images.map((image) => ({
          ...image,
          bucket: JOURNAL_IMAGE_BUCKET,
          path: rewritePath(image),
          previewUrl: undefined,
        })),
      },
    };
  });

  return normalizeJournalContent(rewritten);
}

export function getJournalImagePathScope(path: string) {
  const [authorId, state, entryDate] = path.split("/");

  if (!authorId || !state || !entryDate) {
    return null;
  }

  if (state !== "drafts" && state !== "published") {
    return null;
  }

  return {
    authorId,
    entryDate,
    state,
  };
}
