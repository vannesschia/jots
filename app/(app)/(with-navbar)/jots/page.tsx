import JotsClient from "./jots-client";
import { getPublishedEntryDates } from "@/lib/entries/dal";

export default async function JotsPage() {
  const entryDates = await getPublishedEntryDates();

  return <JotsClient initialEntryDates={entryDates} />;
}
