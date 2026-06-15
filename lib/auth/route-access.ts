const PROTECTED_ROUTE_PREFIXES = [
  "/today",
  "/activity",
  "/friends",
  "/journal",
  "/profile",
  "/settings",
  "/onboarding",
];

export function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function getAuthRedirect(
  pathname: string,
  isAuthenticated: boolean,
) {
  if (pathname === "/") {
    return isAuthenticated ? "/today" : "/login";
  }

  if (pathname === "/signup") {
    return isAuthenticated ? "/today" : "/login";
  }

  if (isAuthenticated && pathname === "/login") {
    return "/today";
  }

  if (!isAuthenticated && isProtectedRoute(pathname)) {
    return "/login";
  }

  return null;
}
