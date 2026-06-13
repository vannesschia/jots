"use client";

import Image from "next/image";
import {
  CheckCircle2,
  GlobeIcon,
  ImagePlus,
  LoaderCircle,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { AvatarCropDialog } from "@/components/onboarding/avatar-crop-dialog";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import {
  checkUsernameAvailability,
  completeOnboarding,
} from "@/lib/onboarding/actions";
import type { UsernameAvailability } from "@/lib/onboarding/types";
import {
  AVATAR_MIME_TYPES,
  DEFAULT_TIMEZONE,
  getDefaultTimezone,
  getInitials,
  getTimezoneGroups,
  MAX_AVATAR_SIZE,
  type TimezoneOption,
} from "@/lib/onboarding/validation";

type OnboardingFormProps = {
  initialDisplayName: string;
  timezones: string[];
};

const inputClassName =
  "h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20";

export function OnboardingForm({
  initialDisplayName,
  timezones,
}: OnboardingFormProps) {
  const [state, action] = useActionState(completeOnboarding, {});
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [availability, setAvailability] =
    useState<UsernameAvailability | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [confirmedAvatar, setConfirmedAvatar] = useState<File | null>(null);
  const [confirmedPreviewUrl, setConfirmedPreviewUrl] = useState<string | null>(
    null,
  );
  const [pendingSourceUrl, setPendingSourceUrl] = useState<string | null>(null);
  const timezoneGroups = useMemo(
    () => getTimezoneGroups(timezones),
    [timezones],
  );
  const timezoneOptions = useMemo(
    () => timezoneGroups.flatMap((group) => group.items),
    [timezoneGroups],
  );
  const [selectedTimezone, setSelectedTimezone] = useState<TimezoneOption>(
    () =>
      timezoneOptions.find(
        (timezone) => timezone.value === DEFAULT_TIMEZONE,
      ) ?? {
        value: DEFAULT_TIMEZONE,
        label: DEFAULT_TIMEZONE,
        searchText: DEFAULT_TIMEZONE.toLowerCase(),
      },
  );
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const confirmedPreviewUrlRef = useRef<string | null>(null);
  const pendingSourceUrlRef = useRef<string | null>(null);
  const usernameRef = useRef("");
  const timezoneManuallySelectedRef = useRef(false);
  const [checkingUsername, startUsernameCheck] = useTransition();

  useEffect(() => {
    let cancelled = false;

    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const defaultTimezone = getDefaultTimezone(
        detectedTimezone,
        timezones,
      );
      const detectedOption = timezoneOptions.find(
        (timezone) => timezone.value === defaultTimezone,
      );

      if (detectedOption) {
        queueMicrotask(() => {
          if (!cancelled && !timezoneManuallySelectedRef.current) {
            setSelectedTimezone(detectedOption);
          }
        });
      }
    } catch {
      // Keep the server-rendered fallback when browser detection is unavailable.
    }

    return () => {
      cancelled = true;
    };
  }, [timezones, timezoneOptions]);

  useEffect(() => {
    return () => {
      if (confirmedPreviewUrlRef.current) {
        URL.revokeObjectURL(confirmedPreviewUrlRef.current);
      }

      if (pendingSourceUrlRef.current) {
        URL.revokeObjectURL(pendingSourceUrlRef.current);
      }
    };
  }, []);

  function setAvatarInputFile(file: File | null) {
    const input = avatarInputRef.current;

    if (!input) {
      return;
    }

    if (!file) {
      input.value = "";
      return;
    }

    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
  }

  function clearPendingSource() {
    if (pendingSourceUrlRef.current) {
      URL.revokeObjectURL(pendingSourceUrlRef.current);
      pendingSourceUrlRef.current = null;
    }

    setPendingSourceUrl(null);
  }

  function replaceConfirmedPreview(nextUrl: string | null) {
    if (confirmedPreviewUrlRef.current) {
      URL.revokeObjectURL(confirmedPreviewUrlRef.current);
    }

    confirmedPreviewUrlRef.current = nextUrl;
    setConfirmedPreviewUrl(nextUrl);
  }

  function handleUsernameBlur() {
    const usernameToCheck = username;

    startUsernameCheck(async () => {
      try {
        const result = await checkUsernameAvailability(usernameToCheck);

        if (usernameRef.current === usernameToCheck) {
          setAvailability(result);
        }
      } catch {
        if (usernameRef.current === usernameToCheck) {
          setAvailability({
            status: "error",
            message: "Could not check now. We will verify it when you submit.",
          });
        }
      }
    });
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !AVATAR_MIME_TYPES.includes(
        file.type as (typeof AVATAR_MIME_TYPES)[number],
      )
    ) {
      setAvatarInputFile(confirmedAvatar);
      setAvatarError("Upload a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarInputFile(confirmedAvatar);
      setAvatarError("Avatar must be 2 MB or smaller.");
      return;
    }

    clearPendingSource();
    const nextSourceUrl = URL.createObjectURL(file);
    pendingSourceUrlRef.current = nextSourceUrl;
    setPendingSourceUrl(nextSourceUrl);
    setAvatarInputFile(confirmedAvatar);
    setAvatarError(null);
  }

  function handleAvatarConfirm(file: File) {
    setAvatarInputFile(file);
    setConfirmedAvatar(file);
    replaceConfirmedPreview(URL.createObjectURL(file));
    clearPendingSource();
    setAvatarError(null);
  }

  function handleAvatarRemove() {
    setAvatarInputFile(null);
    setConfirmedAvatar(null);
    replaceConfirmedPreview(null);
    setAvatarError(null);
  }

  const usernameError = state.fieldErrors?.username;
  const displayNameError = state.fieldErrors?.displayName;
  const avatarFieldError = avatarError ?? state.fieldErrors?.avatar;
  const preferredTimezoneError = state.fieldErrors?.preferredTimezone;

  return (
    <form action={action} className="space-y-6">
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-2xl font-semibold text-brand">
          {confirmedPreviewUrl ? (
            <Image
              alt="Avatar preview"
              className="object-cover"
              fill
              sizes="96px"
              src={confirmedPreviewUrl}
              unoptimized
            />
          ) : (
            getInitials(displayName)
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild variant="outline">
            <label className="cursor-pointer">
              <ImagePlus />
              Choose avatar
              <input
                accept={AVATAR_MIME_TYPES.join(",")}
                className="sr-only"
                name="avatar"
                onChange={handleAvatarChange}
                ref={avatarInputRef}
                type="file"
              />
            </label>
          </Button>
          {confirmedAvatar ? (
            <Button
              onClick={handleAvatarRemove}
              type="button"
              variant="destructive"
            >
              <Trash2 />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Optional. JPEG, PNG, or WebP up to 2 MB.
        </p>
        {avatarFieldError ? (
          <p className="text-sm text-destructive" role="alert">
            {avatarFieldError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="username">
          Username
        </label>
        <input
          aria-describedby="username-help username-status"
          aria-invalid={Boolean(
            usernameError ||
              (availability && availability.status !== "available"),
          )}
          autoCapitalize="none"
          autoComplete="username"
          className={inputClassName}
          id="username"
          maxLength={20}
          name="username"
          onBlur={handleUsernameBlur}
          onChange={(event) => {
            const nextUsername = event.target.value.toLowerCase();
            usernameRef.current = nextUsername;
            setUsername(nextUsername);
            setAvailability(null);
          }}
          pattern="[a-z0-9_]{3,20}"
          placeholder="your_username"
          required
          spellCheck={false}
          value={username}
        />
        <p className="text-xs text-muted-foreground" id="username-help">
          3-20 lowercase letters, numbers, or underscores.
        </p>
        <div className="text-sm" id="username-status">
          {checkingUsername ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Checking username...
            </span>
          ) : availability?.status === "available" ? (
            <span className="inline-flex items-center gap-1.5 text-green-700">
              <CheckCircle2 className="size-4" />
              Username is available.
            </span>
          ) : availability?.status === "taken" ||
            availability?.status === "invalid" ||
            availability?.status === "error" ? (
            <span className="inline-flex items-center gap-1.5 text-destructive">
              <XCircle className="size-4" />
              {availability.message}
            </span>
          ) : usernameError ? (
            <span className="text-destructive">{usernameError}</span>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="displayName">
          Display name
        </label>
        <input
          aria-invalid={Boolean(displayNameError)}
          autoComplete="name"
          className={inputClassName}
          id="displayName"
          maxLength={50}
          name="displayName"
          onChange={(event) => setDisplayName(event.target.value)}
          required
          value={displayName}
        />
        {displayNameError ? (
          <p className="text-sm text-destructive" role="alert">
            {displayNameError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="preferred-timezone">
          Preferred timezone
        </label>
        <Combobox
          filter={(timezone, query) =>
            timezone.searchText.includes(query.trim().toLowerCase())
          }
          isItemEqualToValue={(timezone, value) =>
            timezone.value === value.value
          }
          items={timezoneGroups}
          itemToStringLabel={(timezone) => timezone.label}
          itemToStringValue={(timezone) => timezone.value}
          onValueChange={(timezone) => {
            if (timezone) {
              timezoneManuallySelectedRef.current = true;
              setSelectedTimezone(timezone);
            }
          }}
          value={selectedTimezone}
        >
          <ComboboxTrigger
            aria-invalid={Boolean(preferredTimezoneError)}
            className="h-11 w-full justify-between bg-background px-3 font-normal"
            id="preferred-timezone"
            render={<Button variant="outline" />}
          >
            <span className="flex min-w-0 items-center gap-2">
              <ComboboxValue />
            </span>
          </ComboboxTrigger>
          <ComboboxContent className="max-h-80 bg-popover">
            <ComboboxInput
              autoFocus
              className="bg-background"
              placeholder="Search cities or timezones"
              showTrigger={false}
            >
              <InputGroupAddon>
                <GlobeIcon />
              </InputGroupAddon>
            </ComboboxInput>
            <ComboboxEmpty>No timezones found.</ComboboxEmpty>
            <ComboboxList>
              {(group) => (
                <ComboboxGroup key={group.value} items={group.items}>
                  <ComboboxLabel>{group.value}</ComboboxLabel>
                  <ComboboxCollection>
                    {(timezone) => (
                      <ComboboxItem key={timezone.value} value={timezone}>
                        <span>{timezone.label}</span>
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxGroup>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <input
          name="preferredTimezone"
          type="hidden"
          value={selectedTimezone.value}
        />
        <p className="text-xs text-muted-foreground">
          Times are saved using the standard IANA timezone identifier.
        </p>
        {preferredTimezoneError ? (
          <p className="text-sm text-destructive" role="alert">
            {preferredTimezoneError}
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Creating profile...">
        Finish setup
      </SubmitButton>

      <AvatarCropDialog
        onConfirm={handleAvatarConfirm}
        onDiscard={clearPendingSource}
        open={Boolean(pendingSourceUrl)}
        sourceUrl={pendingSourceUrl}
      />
    </form>
  );
}
