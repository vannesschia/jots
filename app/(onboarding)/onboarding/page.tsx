import { LogoutButton } from "@/components/logout-button";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import {
  getSuggestedDisplayName,
  getSupportedTimezones,
} from "@/lib/onboarding/validation";
import { requireNoProfile } from "@/lib/profile/dal";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireNoProfile();
  const initialDisplayName = getSuggestedDisplayName(user);
  const timezones = getSupportedTimezones();

  return (
    <main className="min-h-svh bg-surface-muted px-6 py-8 sm:py-12">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <div className="flex justify-end">
          <LogoutButton />
        </div>
          <div className="mb-8 space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Set up your profile
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose how friends will recognize you.
            </p>
          </div>
          <OnboardingForm
            initialDisplayName={initialDisplayName}
            timezones={timezones}
          />
      </div>
    </main>
  );
}
