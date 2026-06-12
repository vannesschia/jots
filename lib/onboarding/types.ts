export type OnboardingField =
  | "username"
  | "displayName"
  | "avatar"
  | "preferredTimezone";

export type OnboardingFormState = {
  error?: string;
  fieldErrors?: Partial<Record<OnboardingField, string>>;
};

export type UsernameAvailability =
  | { status: "available" }
  | { status: "taken"; message: string }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };
