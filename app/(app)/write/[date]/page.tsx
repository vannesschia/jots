import { notFound } from "next/navigation";

import { WriteEditor } from "@/app/(app)/write/write-editor";
import { isValidLocalDate } from "@/lib/entries/dates";
import { getJournalWriteData } from "@/lib/entries/dal";

type WriteDatePageProps = {
  params: Promise<{
    date: string;
  }>;
};

export default async function WriteDatePage({ params }: WriteDatePageProps) {
  const { date } = await params;

  if (!isValidLocalDate(date)) {
    notFound();
  }

  const writeData = await getJournalWriteData(date);

  return <WriteEditor {...writeData} />;
}
