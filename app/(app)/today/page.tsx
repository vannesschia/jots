import { requireProfile } from "@/lib/profile/dal";
import TodayClient from "./today-client";

export default async function TodayPage() {
  const profile = await requireProfile();

  return <TodayClient avatarUrl={profile.avatar_url} displayName={profile.display_name} />;
}
