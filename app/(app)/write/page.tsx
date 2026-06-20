import { redirect } from "next/navigation";

import { getTodayInTimezone } from "@/lib/entries/dates";
import { requireProfile } from "@/lib/profile/dal";

export default async function WritePage() {
  const profile = await requireProfile();

  redirect(`/write/${getTodayInTimezone(profile.preferred_timezone)}`);
}
