import type { User } from "@supabase/supabase-js";

import type {
  OnboardingField,
  OnboardingFormState,
} from "@/lib/onboarding/types";
import { getInitials } from "@/lib/profile/avatar";

export { getInitials };

export const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
export const DEFAULT_TIMEZONE = "America/New_York";
export const AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const AVATAR_EXTENSIONS: Record<(typeof AVATAR_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type OnboardingValues = {
  username: string;
  displayName: string;
  preferredTimezone: string;
  avatar: File | null;
};

export type TimezoneOption = {
  value: string;
  label: string;
  searchText: string;
};

export type TimezoneGroup = {
  value: string;
  items: TimezoneOption[];
};

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function getUsernameError(username: string) {
  if (!USERNAME_PATTERN.test(username)) {
    return "Use 3-20 lowercase letters, numbers, or underscores.";
  }

  return null;
}

export function getSupportedTimezones() {
  const supported =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [];

  return [
    DEFAULT_TIMEZONE,
    ...supported.filter((timezone) => timezone !== DEFAULT_TIMEZONE),
    ...(supported.includes("UTC") ? [] : ["UTC"]),
  ];
}

export function isSupportedTimezone(timezone: string) {
  return getSupportedTimezones().includes(timezone);
}

export function getDefaultTimezone(
  detectedTimezone: string | undefined,
  supportedTimezones: string[],
) {
  return detectedTimezone && supportedTimezones.includes(detectedTimezone)
    ? detectedTimezone
    : DEFAULT_TIMEZONE;
}

const TIMEZONE_GROUP_LABELS: Record<string, string> = {
  Africa: "Africa",
  America: "Americas",
  Antarctica: "Antarctica",
  Asia: "Asia",
  Atlantic: "Atlantic",
  Australia: "Australia",
  Europe: "Europe",
  Indian: "Indian Ocean",
  Pacific: "Pacific",
};

function getTimezoneLocationLabel(timezone: string) {
  if (timezone === "UTC") {
    return "Coordinated Universal Time";
  }

  const [, ...locationParts] = timezone.split("/");
  const normalizedParts = locationParts.map((part) =>
    part.replaceAll("_", " "),
  );

  if (normalizedParts.length === 0) {
    return timezone.replaceAll("_", " ");
  }

  return normalizedParts.reverse().join(", ");
}

export function getTimezoneGroups(timezones: string[]): TimezoneGroup[] {
  const groups = new Map<string, TimezoneOption[]>();

  for (const timezone of timezones) {
    const region = timezone.split("/")[0] ?? "Other";
    const groupLabel = TIMEZONE_GROUP_LABELS[region] ?? "Other";
    const locationLabel = getTimezoneLocationLabel(timezone);
    const option = {
      value: timezone,
      label: locationLabel,
      searchText: `${locationLabel} ${timezone} ${groupLabel}`.toLowerCase(),
    };
    const groupItems = groups.get(groupLabel) ?? [];

    groupItems.push(option);
    groups.set(groupLabel, groupItems);
  }

  return Array.from(groups, ([value, items]) => ({
    value,
    items: items.sort((left, right) => left.label.localeCompare(right.label)),
  }));
}

export function getSuggestedDisplayName(user: User) {
  const metadata = user.user_metadata;
  const candidates = [
    metadata.full_name,
    metadata.name,
    user.email?.split("@")[0],
  ];
  const suggestion = candidates.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );

  return suggestion?.trim().slice(0, 50) ?? "";
}

export function getAvatarExtension(file: File) {
  return AVATAR_EXTENSIONS[file.type as keyof typeof AVATAR_EXTENSIONS] ?? null;
}

export function validateOnboardingForm(formData: FormData): {
  values?: OnboardingValues;
  state?: OnboardingFormState;
} {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const displayName = String(formData.get("displayName") ?? "").trim();
  const preferredTimezone = String(
    formData.get("preferredTimezone") ?? "",
  ).trim();
  const avatarValue = formData.get("avatar");
  const avatar =
    avatarValue instanceof File && avatarValue.size > 0 ? avatarValue : null;
  const fieldErrors: Partial<Record<OnboardingField, string>> = {};

  const usernameError = getUsernameError(username);
  if (usernameError) {
    fieldErrors.username = usernameError;
  }

  if (displayName.length < 1 || displayName.length > 50) {
    fieldErrors.displayName = "Display name must be between 1 and 50 characters.";
  }

  if (!isSupportedTimezone(preferredTimezone)) {
    fieldErrors.preferredTimezone = "Choose a valid timezone.";
  }

  if (avatar) {
    if (!getAvatarExtension(avatar)) {
      fieldErrors.avatar = "Upload a JPEG, PNG, or WebP image.";
    } else if (avatar.size > MAX_AVATAR_SIZE) {
      fieldErrors.avatar = "Avatar must be 2 MB or smaller.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { state: { fieldErrors } };
  }

  return {
    values: {
      username,
      displayName,
      preferredTimezone,
      avatar,
    },
  };
}
