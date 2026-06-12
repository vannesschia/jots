import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { getOnboardingRedirect } from "@/lib/profile/routing";
import type { Profile } from "@/lib/profile/types";
import { createClient } from "@/lib/supabase/server";

export async function getProfileByUserId(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, preferred_timezone, created_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load profile: ${error.message}`);
  }

  return data as Profile | null;
}

export const getCurrentProfile = cache(async () => {
  const user = await requireUser();
  return getProfileByUserId(user.id);
});

export const requireProfile = cache(async () => {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/onboarding");
  }

  return profile;
});

export const requireNoProfile = cache(async () => {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const destination = getOnboardingRedirect(Boolean(profile));

  if (destination) {
    redirect(destination);
  }

  return user;
});
