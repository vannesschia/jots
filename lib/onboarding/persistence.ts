import { getAvatarExtension } from "@/lib/onboarding/validation";

export type ProfileInsert = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  preferred_timezone: string;
};

export type PersistenceError = {
  code?: string;
  message: string;
};

export type OnboardingStore = {
  uploadAvatar: (
    path: string,
    file: File,
  ) => Promise<{ publicUrl?: string; error?: PersistenceError }>;
  deleteAvatar: (path: string) => Promise<void>;
  insertProfile: (
    profile: ProfileInsert,
  ) => Promise<{ error?: PersistenceError }>;
};

export type PersistOnboardingResult =
  | { status: "success" }
  | { status: "username_taken" }
  | { status: "profile_exists" }
  | { status: "upload_failed"; message: string }
  | { status: "database_failed"; message: string };

type PersistOnboardingInput = {
  userId: string;
  username: string;
  displayName: string;
  preferredTimezone: string;
  avatar: File | null;
};

export async function persistOnboarding(
  store: OnboardingStore,
  input: PersistOnboardingInput,
  createId: () => string = () => crypto.randomUUID(),
): Promise<PersistOnboardingResult> {
  let avatarPath: string | null = null;
  let avatarUrl: string | null = null;

  if (input.avatar) {
    const extension = getAvatarExtension(input.avatar);

    if (!extension) {
      return {
        status: "upload_failed",
        message: "Unsupported avatar format.",
      };
    }

    avatarPath = `${input.userId}/${createId()}.${extension}`;
    const upload = await store.uploadAvatar(avatarPath, input.avatar);

    if (upload.error || !upload.publicUrl) {
      return {
        status: "upload_failed",
        message: upload.error?.message ?? "Avatar upload failed.",
      };
    }

    avatarUrl = upload.publicUrl;
  }

  const { error } = await store.insertProfile({
    id: input.userId,
    username: input.username,
    display_name: input.displayName,
    avatar_url: avatarUrl,
    preferred_timezone: input.preferredTimezone,
  });

  if (!error) {
    return { status: "success" };
  }

  if (avatarPath) {
    await store.deleteAvatar(avatarPath);
  }

  if (error.code === "23505") {
    return error.message.includes("profiles_pkey")
      ? { status: "profile_exists" }
      : { status: "username_taken" };
  }

  return { status: "database_failed", message: error.message };
}
