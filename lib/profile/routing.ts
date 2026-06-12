export function getAuthenticatedDestination(hasProfile: boolean) {
  return hasProfile ? "/today" : "/onboarding";
}

export function getOnboardingRedirect(hasProfile: boolean) {
  return hasProfile ? "/today" : null;
}
