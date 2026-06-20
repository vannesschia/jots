import "server-only";

import {
  EMPTY_JOURNAL_CONTENT,
  JOURNAL_IMAGE_BUCKET,
  getJournalContent,
  type JournalContent,
} from "@/lib/entries/content";
import { hydrateJournalImagePreviews } from "@/lib/entries/image-urls";
import { requireProfile } from "@/lib/profile/dal";
import { createClient } from "@/lib/supabase/server";

const JOURNAL_IMAGE_SIGNED_URL_SECONDS = 60 * 60;

type EntryContentRow = {
  content: unknown;
  updated_at: string;
};

export type JournalWriteData = {
  authorId: string;
  draft: {
    content: JournalContent;
    updatedAt: string;
  } | null;
  entryDate: string;
  initialContent: JournalContent;
  initialSource: "draft" | "published" | "empty";
  initialUpdatedAt: string | null;
  published: {
    content: JournalContent;
    updatedAt: string;
  } | null;
  timezone: string;
};

export async function getJournalWriteData(
  entryDate: string,
): Promise<JournalWriteData> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [draftResult, publishedResult] = await Promise.all([
    supabase
      .from("journal_entry_drafts")
      .select("content, updated_at")
      .eq("author_id", profile.id)
      .eq("entry_date", entryDate)
      .maybeSingle(),
    supabase
      .from("journal_entries")
      .select("content, updated_at")
      .eq("author_id", profile.id)
      .eq("entry_date", entryDate)
      .maybeSingle(),
  ]);

  if (draftResult.error) {
    throw new Error(`Unable to load journal draft: ${draftResult.error.message}`);
  }

  if (publishedResult.error) {
    throw new Error(
      `Unable to load published entry: ${publishedResult.error.message}`,
    );
  }

  const draftRow = draftResult.data as EntryContentRow | null;
  const publishedRow = publishedResult.data as EntryContentRow | null;
  async function hydrateContent(content: JournalContent) {
    return hydrateJournalImagePreviews(content, async (paths) => {
      const { data, error } = await supabase.storage
        .from(JOURNAL_IMAGE_BUCKET)
        .createSignedUrls(paths, JOURNAL_IMAGE_SIGNED_URL_SECONDS);

      if (error) {
        throw new Error(`Unable to load journal images: ${error.message}`);
      }

      const signedUrls = new Map<string, string>();

      for (const entry of data ?? []) {
        if (entry.path && entry.signedUrl) {
          signedUrls.set(entry.path, entry.signedUrl);
        }
      }

      return signedUrls;
    });
  }

  const draft = draftRow
    ? {
        content: await hydrateContent(getJournalContent(draftRow.content)),
        updatedAt: draftRow.updated_at,
      }
    : null;
  const published = publishedRow
    ? {
        content: await hydrateContent(getJournalContent(publishedRow.content)),
        updatedAt: publishedRow.updated_at,
      }
    : null;
  const initialSource = draft ? "draft" : published ? "published" : "empty";
  const initialUpdatedAt = draft?.updatedAt ?? published?.updatedAt ?? null;
  const initialContent =
    draft?.content ?? published?.content ?? EMPTY_JOURNAL_CONTENT;

  return {
    authorId: profile.id,
    draft,
    entryDate,
    initialContent,
    initialSource,
    initialUpdatedAt,
    published,
    timezone: profile.preferred_timezone,
  };
}

export async function getPublishedEntryDates() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("entry_date")
    .eq("author_id", profile.id)
    .order("entry_date", { ascending: false });

  if (error) {
    throw new Error(`Unable to load journal entry dates: ${error.message}`);
  }

  return (data ?? []).map((entry) => entry.entry_date as string);
}
