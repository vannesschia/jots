const PROTECTED_ROUTE_PREFIXES = [
  "/jots",
  "/activity",
  "/friends",
  "/profile",
  "/settings",
  "/onboarding",
  "/write",
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
    return isAuthenticated ? "/jots" : "/login";
  }

  if (pathname === "/signup") {
    return isAuthenticated ? "/jots" : "/login";
  }

  if (isAuthenticated && pathname === "/login") {
    return "/jots";
  }

  if (!isAuthenticated && isProtectedRoute(pathname)) {
    return "/login";
  }

  return null;
}
