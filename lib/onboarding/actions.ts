"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  type OnboardingFormState,
  type UsernameAvailability,
} from "@/lib/onboarding/types";
import {
  getUsernameError,
  normalizeUsername,
  validateOnboardingForm,
} from "@/lib/onboarding/validation";
import {
  persistOnboarding,
  type OnboardingStore,
  type PersistenceError,
} from "@/lib/onboarding/persistence";
import { requireNoProfile } from "@/lib/profile/dal";
import { createClient } from "@/lib/supabase/server";

export async function checkUsernameAvailability(
  rawUsername: string,
): Promise<UsernameAvailability> {
  await requireNoProfile();

  const username = normalizeUsername(rawUsername);
  const validationError = getUsernameError(username);

  if (validationError) {
    return { status: "invalid", message: validationError };
  }

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("username", username);

  if (error) {
    throw new Error(`Unable to check username: ${error.message}`);
  }

  return count === 0
    ? { status: "available" }
    : { status: "taken", message: "Username is already taken." };
}

export async function completeOnboarding(
  _state: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const user = await requireNoProfile();
  const validation = validateOnboardingForm(formData);

  if (!validation.values) {
    return validation.state ?? { error: "Check the form and try again." };
  }

  const supabase = await createClient();
  const store: OnboardingStore = {
    async uploadAvatar(path, file) {
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

      if (error) {
        return {
          error: {
            message: error.message,
          },
        };
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      return { publicUrl: data.publicUrl };
    },
    async deleteAvatar(path) {
      await supabase.storage.from("avatars").remove([path]);
    },
    async insertProfile(profile) {
      const { error } = await supabase.from("profiles").insert(profile);

      return {
        error: error
          ? ({
              code: error.code,
              message: error.message,
            } satisfies PersistenceError)
          : undefined,
      };
    },
  };

  const result = await persistOnboarding(store, {
    userId: user.id,
    username: validation.values.username,
    displayName: validation.values.displayName,
    preferredTimezone: validation.values.preferredTimezone,
    avatar: validation.values.avatar,
  });

  switch (result.status) {
    case "success":
      revalidatePath("/", "layout");
      redirect("/jots");
    case "profile_exists":
      redirect("/jots");
    case "username_taken":
      return {
        fieldErrors: {
          username: "Username is already taken.",
        },
      };
    case "upload_failed":
      return {
        fieldErrors: {
          avatar: "Avatar upload failed. Please try another image.",
        },
      };
    case "database_failed":
      return {
        error: "We could not finish setting up your profile. Please try again.",
      };
  }
}
