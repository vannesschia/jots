import {
  JOURNAL_IMAGE_MIME_TYPES,
  type JournalImageMimeType,
} from "@/lib/entries/content";

export const JOURNAL_IMAGE_INPUT_EXTENSIONS = [
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
] as const;

export function isAcceptedJournalImageInputFile(file: File) {
  return JOURNAL_IMAGE_MIME_TYPES.includes(file.type as JournalImageMimeType);
}
