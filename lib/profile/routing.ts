export function getAuthenticatedDestination(hasProfile: boolean) {
  return hasProfile ? "/jots" : "/onboarding";
}

export function getOnboardingRedirect(hasProfile: boolean) {
  return hasProfile ? "/jots" : null;
}
