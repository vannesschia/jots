import {
  JOURNAL_IMAGE_CONVERTIBLE_MIME_TYPES,
  JOURNAL_IMAGE_INPUT_MIME_TYPES,
  type JournalImageInputMimeType,
} from "@/lib/entries/content";

const JOURNAL_IMAGE_WEBP_QUALITY = 0.9;

function isConvertibleImageFile(file: File) {
  const lowerName = file.name.toLowerCase();

  return (
    JOURNAL_IMAGE_CONVERTIBLE_MIME_TYPES.includes(
      file.type as (typeof JOURNAL_IMAGE_CONVERTIBLE_MIME_TYPES)[number],
    ) ||
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif")
  );
}

function getConvertedImageName(name: string) {
  const withoutExtension = name.replace(/\.[^.]+$/, "").trim();
  return `${withoutExtension || "journal-image"}.webp`;
}

async function convertHeicToWebp(file: File) {
  const { default: heic2any } = await import("heic2any");
  const output = await heic2any({
    blob: file,
    quality: JOURNAL_IMAGE_WEBP_QUALITY,
    toType: "image/webp",
  });
  const blob = Array.isArray(output) ? output[0] : output;

  if (!blob || blob.type !== "image/webp") {
    throw new Error("This HEIC image could not be converted.");
  }

  return new File([blob], getConvertedImageName(file.name), {
    lastModified: Date.now(),
    type: "image/webp",
  });
}

export function isAcceptedJournalImageInputFile(file: File) {
  return (
    JOURNAL_IMAGE_INPUT_MIME_TYPES.includes(
      file.type as JournalImageInputMimeType,
    ) || isConvertibleImageFile(file)
  );
}

export async function prepareJournalImageFiles(files: File[]) {
  try {
    return await Promise.all(
      files.map((file) =>
        isConvertibleImageFile(file) ? convertHeicToWebp(file) : file,
      ),
    );
  } catch {
    throw new Error(
      "We could not convert one of these HEIC images. Try another image.",
    );
  }
}
